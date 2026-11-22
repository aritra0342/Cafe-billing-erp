import "server-only";
import readXlsxFile from "read-excel-file/node";
import writeXlsxFile, { type Row, type SheetData } from "write-excel-file/node";
import { formatINR, type Category, type Diet, type MenuItem, type Option } from "./billing";

/**
 * The menu as a spreadsheet: one row per item, sizes and add-ons written as "Small = 45; Large = 70".
 * Export writes it; import reads it back, matches rows to items by name and plans the changes,
 * so the café can review them before anything is saved.
 */

export const MAX_SHEET_BYTES = 1_000_000;
const MAX_ROWS = 1000;

type Field = "category" | "item" | "price" | "type" | "available" | "sizes" | "addons" | "description";
const COLUMNS: { field: Field; title: string; width: number; aliases: string[] }[] = [
  { field: "category", title: "Category", width: 20, aliases: ["category", "section", "group"] },
  { field: "item", title: "Item", width: 32, aliases: ["item", "name", "itemname", "dish", "product"] },
  { field: "price", title: "Price", width: 10, aliases: ["price", "rate", "mrp", "amount", "cost"] },
  { field: "type", title: "Type", width: 10, aliases: ["type", "diet", "vegnonveg", "veg"] },
  { field: "available", title: "Available", width: 11, aliases: ["available", "instock", "onsale", "status"] },
  { field: "sizes", title: "Sizes", width: 30, aliases: ["sizes", "size", "variants", "variant"] },
  { field: "addons", title: "Add-ons", width: 30, aliases: ["addons", "addon", "extras", "extra"] },
  { field: "description", title: "Description", width: 44, aliases: ["description", "details", "notes"] },
];

const DIET_LABEL: Record<Diet, string> = { veg: "Veg", nonveg: "Non-veg", egg: "Egg" };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** "Rate (₹)" and "Price in Rs" both read as the price column. */
const header = (s: string) => norm(s.replace(/\(.*?\)/g, "").replace(/\b(in\s+)?(rs|inr|rupees)\.?$/i, ""));
const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
const writeOptions = (opts: Option[]) => opts.map((o) => `${o.name} = ${o.price}`).join("; ");

// ---------- Export ----------

export async function menuWorkbook(categories: Category[], items: MenuItem[]): Promise<Buffer> {
  const header: Row = COLUMNS.map((c) => ({ value: c.title, fontWeight: "bold" as const }));
  const rows: SheetData = [header];
  for (const c of [...categories].sort((a, b) => a.sortOrder - b.sortOrder)) {
    for (const i of items.filter((it) => it.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder)) {
      rows.push([c.name, i.name, i.variants.length ? null : i.price, DIET_LABEL[i.diet], i.available ? "Yes" : "No", writeOptions(i.variants), writeOptions(i.addons), i.description]);
    }
  }
  const help: SheetData = [
    [{ value: "How to update your menu from this sheet", fontWeight: "bold" }],
    [""],
    ["One row per item. Change prices, names or anything else on the Menu sheet, add rows for new items, then upload the file on the Menu page."],
    ["You'll see every change before it's saved."],
    [""],
    [{ value: "Column", fontWeight: "bold" }, { value: "What to write", fontWeight: "bold" }],
    ["Category", "The menu section, like Hot coffee. A new name makes a new section. Leave it blank to use the category of the row above."],
    ["Item", "The item's name. Rows are matched to your menu by this name, so renaming an item here adds it as a new item."],
    ["Price", "In rupees, like 120. Leave it blank when the item has sizes."],
    ["Type", "Veg, Non-veg or Egg. Blank means Veg."],
    ["Available", "Yes, or No for sold out. Blank means Yes."],
    ["Sizes", "Each size and its price, separated by semicolons: Small = 120; Large = 160"],
    ["Add-ons", "Same format: Extra shot = 40; Oat milk = 50"],
    ["Description", "Optional."],
  ];
  return writeXlsxFile([
    { sheet: "Menu", data: rows, columns: COLUMNS.map((c) => ({ width: c.width })), stickyRowsCount: 1 },
    { sheet: "How to fill", data: help, columns: [{ width: 16 }, { width: 110 }] },
  ]).toBuffer();
}

// ---------- Import ----------

export type SheetRow = {
  row: number;
  category: string;
  name: string;
  price: number | null;
  diet: Diet | null;
  available: boolean | null;
  variants: { name: string; price: number }[] | null; // null: column not in the sheet, keep as is
  addons: { name: string; price: number }[] | null;
  description: string | null;
};
export type Problem = { row: number; message: string; name?: string };

const text = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)).trim();

function money(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  const t = text(v).replace(/₹|rs\.?|inr|\/-|,/gi, "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

function diet(v: unknown): Diet | null | undefined {
  const t = norm(text(v));
  if (!t) return null;
  if (["veg", "v", "vegetarian", "green"].includes(t)) return "veg";
  if (["nonveg", "nv", "nonvegetarian", "red", "chicken", "meat", "fish"].includes(t)) return "nonveg";
  if (["egg", "e", "eggetarian", "containsegg"].includes(t)) return "egg";
  return undefined; // unrecognised
}

function yesNo(v: unknown): boolean | null | undefined {
  if (typeof v === "boolean") return v;
  const t = norm(text(v));
  if (!t) return null;
  if (["yes", "y", "true", "1", "available", "instock", "onsale"].includes(t)) return true;
  if (["no", "n", "false", "0", "soldout", "unavailable", "outofstock"].includes(t)) return false;
  return undefined;
}

/** "Small = 45; Large 70" -> [{Small, 45}, {Large, 70}]. Anything unreadable comes back in `bad`. */
function options(v: unknown) {
  const opts: { name: string; price: number }[] = [];
  const bad: string[] = [];
  for (const part of text(v).split(/[;\n|]+/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(.+?)\s*(?:=|:|-|–|@)?\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d{1,2})?)\s*(?:\/-)?$/i);
    const name = m?.[1].trim().replace(/[=:–@-]$/, "").trim();
    if (m && name) opts.push({ name: name.slice(0, 64), price: Number(m[2]) });
    else bad.push(part);
  }
  return { opts: opts.slice(0, 30), bad };
}

/** Splits CSV text into rows. Handles quoted cells, "" escapes, CRLF and a leading BOM; the delimiter is whichever of , ; or tab the header row uses most. */
export function parseCsv(input: string): string[][] {
  const src = input.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((x, i) => b[i] === x);

/** The file's rows, whatever the browser called it: .xlsx is recognised by its zip signature, anything else readable as text is taken as CSV. */
async function sheetData(file: Blob): Promise<{ data: unknown[][] } | { problem: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    try {
      const sheets = await readXlsxFile(Buffer.from(bytes));
      return { data: (sheets.find((s) => norm(s.sheet) === "menu") ?? sheets[0])?.data ?? [] };
    } catch (e) {
      console.error("menu sheet: xlsx read failed", e);
      return { problem: "This Excel file couldn't be read. Open it in Excel or Google Sheets, save or download it again as .xlsx, and upload that copy." };
    }
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) return { problem: "This is the old Excel format (.xls). In Excel choose File → Save As → Excel Workbook (.xlsx), then upload the new file." };
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (decoded.includes("�") || /[\x00-\x08\x0e-\x1f]/.test(decoded.slice(0, 4096))) {
    return { problem: "This isn't a spreadsheet. Upload the menu as an Excel file (.xlsx) or a CSV file." };
  }
  return { data: parseCsv(decoded) };
}

export async function readMenuSheet(file: Blob): Promise<{ rows: SheetRow[]; problems: Problem[] }> {
  const read = await sheetData(file);
  if ("problem" in read) return { rows: [], problems: [{ row: 0, message: read.problem }] };
  const data = read.data;
  const headerAt = data.findIndex((r) => r.some((c) => COLUMNS.find((col) => col.field === "item")!.aliases.includes(header(text(c)))));
  if (headerAt === -1) return { rows: [], problems: [{ row: 0, message: "No header row with an Item column was found. The first row should have Category, Item, Price and so on." }] };

  const col: Partial<Record<Field, number>> = {};
  data[headerAt].forEach((c, i) => {
    const f = COLUMNS.find((x) => x.aliases.includes(header(text(c))));
    if (f && col[f.field] === undefined) col[f.field] = i;
  });
  if (col.category === undefined) return { rows: [], problems: [{ row: headerAt + 1, message: "Add a Category column so each item knows which section it belongs to." }] };
  if (col.price === undefined && col.sizes === undefined) return { rows: [], problems: [{ row: headerAt + 1, message: "Add a Price column (or a Sizes column) so items have prices." }] };

  const rows: SheetRow[] = [];
  const problems: Problem[] = [];
  const seen = new Map<string, number>();
  let lastCategory = "";
  const body = data.slice(headerAt + 1);
  if (body.length > MAX_ROWS) problems.push({ row: 0, message: `Only the first ${MAX_ROWS} rows are read.` });

  body.slice(0, MAX_ROWS).forEach((r, i) => {
    const row = headerAt + i + 2; // as numbered in Excel
    const get = (f: Field) => (col[f] === undefined ? undefined : r[col[f]!]);
    const name = text(get("item")).replace(/\s+/g, " ").slice(0, 128);
    const category = (text(get("category")) || lastCategory).replace(/\s+/g, " ").slice(0, 64);
    if (!name) {
      if (text(get("category"))) lastCategory = category;
      return; // blank or heading-only row
    }
    lastCategory = category;
    const fail = (message: string) => problems.push({ row, name, message: `${name}: ${message}` });
    if (!category) return fail("no category. Fill in the Category column.");

    const sizes = col.sizes === undefined ? null : options(get("sizes"));
    const addons = col.addons === undefined ? null : options(get("addons"));
    if (sizes?.bad.length) return fail(`couldn't read the size "${sizes.bad[0]}". Write sizes like Small = 120; Large = 160.`);
    if (addons?.bad.length) return fail(`couldn't read the add-on "${addons.bad[0]}". Write add-ons like Extra shot = 40.`);
    const price = col.price === undefined ? null : money(get("price"));
    if (Number.isNaN(price)) return fail(`the price "${text(get("price"))}" isn't a number.`);
    if (price !== null && price < 0) return fail("the price can't be negative.");
    if (!sizes?.opts.length && !(price && price > 0)) return fail("no price. Fill in Price, or list sizes with their prices.");
    const d = col.type === undefined ? null : diet(get("type"));
    if (d === undefined) return fail(`the type "${text(get("type"))}" should be Veg, Non-veg or Egg.`);
    const a = col.available === undefined ? null : yesNo(get("available"));
    if (a === undefined) return fail(`Available should be Yes or No, not "${text(get("available"))}".`);

    const k = key(name);
    if (seen.has(k)) return fail(`appears twice (rows ${seen.get(k)} and ${row}). Only row ${seen.get(k)} is used.`);
    seen.set(k, row);
    rows.push({
      row,
      category,
      name,
      price,
      diet: d,
      available: a,
      variants: sizes ? sizes.opts : null,
      addons: addons ? addons.opts : null,
      description: col.description === undefined ? null : text(get("description")).slice(0, 512),
    });
  });
  return { rows, problems };
}

// ---------- Plan ----------

export type ItemData = { categoryId: string; name: string; description: string; price: number; diet: Diet; available: boolean; variants: Option[]; addons: Option[] };
export type MenuPlan = {
  newCategories: string[];
  added: { row: number; category: string; name: string; price: string }[];
  changed: { row: number; id: string; name: string; changes: string[] }[];
  unchanged: number;
  missing: { id: string; name: string; category: string }[];
  problems: Problem[];
};
type Ops = {
  newCategories: string[];
  creates: (Omit<ItemData, "categoryId"> & { category: string })[];
  updates: { id: string; category: string; data: Omit<ItemData, "categoryId"> }[];
};

const rupees = (n: number) => formatINR(n).replace(".00", "");
const priceText = (price: number, variants: { price: number }[]) => {
  if (!variants.length) return rupees(price);
  const lo = Math.min(...variants.map((v) => v.price));
  const hi = Math.max(...variants.map((v) => v.price));
  return lo === hi ? rupees(lo) : `${rupees(lo)}–${rupees(hi).replace("₹", "")}`;
};
const sameOptions = (a: Option[], b: { name: string; price: number }[]) => a.length === b.length && a.every((o, i) => o.name === b[i].name && o.price === b[i].price);

/** Keeps the ids of sizes and add-ons whose names didn't change. */
const withIds = (next: { name: string; price: number }[], prev: Option[], newId: () => string): Option[] =>
  next.map((o) => ({ id: prev.find((p) => key(p.name) === key(o.name))?.id ?? newId(), name: o.name, price: o.price }));

export function planMenuImport(sheet: { rows: SheetRow[]; problems: Problem[] }, categories: Category[], items: MenuItem[], newId: () => string): { plan: MenuPlan; ops: Ops } {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catByName = new Map(categories.map((c) => [key(c.name), c]));
  const byName = new Map<string, MenuItem[]>();
  for (const i of items) byName.set(key(i.name), [...(byName.get(key(i.name)) ?? []), i]);

  const plan: MenuPlan = { newCategories: [], added: [], changed: [], unchanged: 0, missing: [], problems: [...sheet.problems] };
  const ops: Ops = { newCategories: [], creates: [], updates: [] };
  const matched = new Set<string>();

  for (const r of sheet.rows) {
    const cat = catByName.get(key(r.category));
    const categoryName = cat?.name ?? r.category;
    if (!cat && !ops.newCategories.some((n) => key(n) === key(r.category))) {
      ops.newCategories.push(r.category);
      plan.newCategories.push(r.category);
    }
    const candidates = (byName.get(key(r.name)) ?? []).filter((i) => !matched.has(i.id));
    const existing = candidates.find((i) => cat && i.categoryId === cat.id) ?? candidates[0];

    const variants = r.variants === null ? (existing?.variants ?? []) : withIds(r.variants, existing?.variants ?? [], newId);
    const addons = r.addons === null ? (existing?.addons ?? []) : withIds(r.addons, existing?.addons ?? [], newId);
    const data = {
      name: r.name,
      description: r.description ?? existing?.description ?? "",
      price: variants.length ? Math.min(...variants.map((v) => v.price)) : (r.price ?? existing?.price ?? 0),
      diet: r.diet ?? existing?.diet ?? "veg",
      available: r.available ?? existing?.available ?? true,
      variants,
      addons,
    };
    if (!variants.length && !(data.price > 0)) {
      plan.problems.push({ row: r.row, name: r.name, message: `${r.name}: no price. Fill in Price, or list sizes with their prices.` });
      continue;
    }

    if (!existing) {
      ops.creates.push({ ...data, category: categoryName });
      plan.added.push({ row: r.row, category: categoryName, name: r.name, price: priceText(data.price, variants) });
      continue;
    }
    matched.add(existing.id);
    const changes: string[] = [];
    const fromCat = catById.get(existing.categoryId)?.name;
    if (!cat || cat.id !== existing.categoryId) changes.push(`Moved from ${fromCat ?? "another section"} to ${categoryName}`);
    if (existing.name !== data.name) changes.push(`Renamed from ${existing.name}`);
    if (!variants.length && existing.variants.length) changes.push(`Sizes removed, price ${rupees(data.price)}`);
    else if (!variants.length && existing.price !== data.price) changes.push(`Price ${rupees(existing.price)} → ${rupees(data.price)}`);
    if (variants.length && !sameOptions(existing.variants, variants)) changes.push(`Sizes: ${variants.map((v) => `${v.name} ${rupees(v.price)}`).join(", ")}`);
    if (!sameOptions(existing.addons, addons)) changes.push(addons.length ? `Add-ons: ${addons.map((a) => `${a.name} ${rupees(a.price)}`).join(", ")}` : "Add-ons removed");
    if (existing.diet !== data.diet) changes.push(`${DIET_LABEL[existing.diet]} → ${DIET_LABEL[data.diet]}`);
    if (existing.available !== data.available) changes.push(data.available ? "Back on sale" : "Marked sold out");
    if (existing.description !== data.description) changes.push(data.description ? "Description changed" : "Description removed");
    if (changes.length) {
      plan.changed.push({ row: r.row, id: existing.id, name: r.name, changes });
      ops.updates.push({ id: existing.id, category: categoryName, data });
    } else plan.unchanged++;
  }

  // Rows that failed to read never count as missing: their item stays, untouched.
  const failedNames = new Set(plan.problems.flatMap((p) => (p.name ? [key(p.name)] : [])));
  plan.missing = items
    .filter((i) => !matched.has(i.id) && !failedNames.has(key(i.name)))
    .map((i) => ({ id: i.id, name: i.name, category: catById.get(i.categoryId)?.name ?? "" }));
  plan.problems.sort((a, b) => a.row - b.row);
  return { plan, ops };
}
