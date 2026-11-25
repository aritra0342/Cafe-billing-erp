import "server-only";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { createHash } from "node:crypto";
import { tables } from "./appwrite/server";
import { requireUser } from "./auth";
import { menuTag, settingsTag } from "./cache-tags";
import type { Settings, MenuItems, Invoices, QueryBuilder } from "./appwrite/generated/appwrite";
import {
  startOfTodayIST,
  istDayStart,
  cleanSplit,
  tenders,
  type PaymentSplit,
  type Tender,
  inferPricesIncludeTax,
  parseYmd,
  type Business,
  type Category,
  type InvoiceDoc,
  type MenuItem,
  type Option,
  type LineChange,
  type PaymentMode,
  type PaymentStatus,
  type TaxMode,
} from "./billing";

// Data Access Layer. The generated client runs with the API key, so ownership is enforced here:
// every read is scoped to the signed-in user's ownerId, and fetched-by-id rows are checked.

export type CafeSettings = {
  cafeName: string;
  legalName: string;
  address: string;
  city: string;
  pincode: string;
  stateCode: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
  taxMode: TaxMode;
  gstRate: number;
  pricesIncludeTax: boolean;
  invoicePrefix: string;
  upiId: string;
  footerNote: string;
  defaultTemplate: string;
  accentColor: string;
};

export const DEFAULT_SETTINGS: CafeSettings = {
  cafeName: "",
  legalName: "",
  address: "",
  city: "",
  pincode: "",
  stateCode: "",
  phone: "",
  email: "",
  gstin: "",
  fssai: "",
  taxMode: "regular",
  gstRate: 5,
  pricesIncludeTax: false,
  invoicePrefix: "INV",
  upiId: "",
  footerNote: "Thank you for visiting! See you again soon.",
  defaultTemplate: "thermal80",
  accentColor: "#1b2459",
};

const parseOptions = (json?: string): Option[] => {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const parseSplit = (json?: string | null): PaymentSplit => {
  try {
    return cleanSplit(JSON.parse(json || "{}"));
  } catch {
    return {};
  }
};

export function toSettings(row: Settings | null): CafeSettings | null {
  if (!row) return null;
  const s = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(s) as (keyof CafeSettings)[]) {
    const v = row[k];
    if (v !== undefined && v !== null) (s as Record<string, unknown>)[k] = v;
  }
  return s;
}

export const toBusiness = (s: CafeSettings): Business => ({
  cafeName: s.cafeName,
  legalName: s.legalName,
  address: s.address,
  city: s.city,
  pincode: s.pincode,
  stateCode: s.stateCode,
  phone: s.phone,
  email: s.email,
  gstin: s.gstin,
  fssai: s.fssai,
  upiId: s.upiId,
  footerNote: s.footerNote,
  accentColor: s.accentColor,
});

export const toMenuItem = (r: MenuItems): MenuItem => ({
  id: r.$id,
  categoryId: r.categoryId,
  name: r.name,
  description: r.description ?? "",
  price: r.price ?? 0,
  diet: r.diet ?? "veg",
  available: r.available ?? true,
  variants: parseOptions(r.variants),
  addons: parseOptions(r.addons),
  sortOrder: r.sortOrder ?? 0,
  photo: r.photo ?? "",
});

/**
 * A fingerprint of a bill's lines. The edit counter refers to saved lines by position, so an edit is only
 * accepted against the same lines it was opened with; otherwise a position could point at a different item.
 */
export const linesRevision = (lines: InvoiceDoc["lines"]) => createHash("sha256").update(JSON.stringify(lines)).digest("base64url").slice(0, 22);

export function toInvoiceDoc(r: Invoices): InvoiceDoc {
  let business: Business;
  try {
    business = JSON.parse(r.business || "{}");
  } catch {
    business = toBusiness(DEFAULT_SETTINGS);
  }
  let lines: InvoiceDoc["lines"] = [];
  try {
    lines = JSON.parse(r.lines || "[]");
  } catch {}
  return {
    id: r.$id,
    number: r.number,
    issuedAt: r.issuedAt,
    customerName: r.customerName ?? "",
    customerPhone: r.customerPhone ?? "",
    customerGstin: r.customerGstin ?? "",
    customerAddress: r.customerAddress ?? "",
    orderType: r.orderType ?? "dine_in",
    tableNo: r.tableNo ?? "",
    paymentMode: r.paymentMode ?? "cash",
    paymentSplit: parseSplit(r.paymentSplit),
    // Bills from before paid/due existed were all settled at the counter.
    status: r.status ?? "paid",
    paidAt: r.paidAt ?? "",
    templateId: r.templateId ?? "classic",
    lines,
    discountType: r.discountType ?? "flat",
    discountValue: r.discountValue ?? 0,
    subtotal: r.subtotal ?? 0,
    discount: r.discount ?? 0,
    taxable: r.taxable ?? 0,
    cgst: r.cgst ?? 0,
    sgst: r.sgst ?? 0,
    roundOff: r.roundOff ?? 0,
    total: r.total ?? 0,
    taxMode: r.taxMode ?? "regular",
    gstRate: r.gstRate ?? 0,
    pricesIncludeTax: r.pricesIncludeTax ?? inferPricesIncludeTax({ subtotal: r.subtotal ?? 0, discount: r.discount ?? 0, taxable: r.taxable ?? 0 }, r.taxMode ?? "regular", r.gstRate ?? 0),
    business: { ...toBusiness(DEFAULT_SETTINGS), ...business },
    notes: r.notes ?? "",
  };
}

// ---------- Reads ----------

export async function getSettingsFor(userId: string) {
  // Listed with select so the logo (a data URL, up to ~200 KB) isn't fetched on every page.
  const { rows } = await tables.settings.list({
    queries: (q) => [q.equal("ownerId", userId), q.select(["ownerId", ...(Object.keys(DEFAULT_SETTINGS) as (keyof CafeSettings)[])]), q.limit(1)],
  });
  return toSettings(rows[0] ?? null); // null: not set up yet
}

/*
 * Appwrite bills every row a query returns. The menu (often 60 to 100 rows) and the café settings change only when
 * someone edits them, yet were read on every counter, menu and settings page render. Pages read them through these
 * caches instead, one entry per café, tagged so the menu and settings actions clear them the moment anything changes
 * (see lib/cache-tags.ts). The cached helpers take the user id from the exported getters below, which resolve it from
 * the session, and stay unexported so nothing can ask for another café's data.
 * Server actions that write keep reading fresh (getSettingsFor, getMenuFresh); bills are never cached.
 */
async function cachedSettings(userId: string) {
  "use cache: remote";
  cacheTag(settingsTag(userId));
  cacheLife("days");
  return getSettingsFor(userId);
}

async function cachedLogo(userId: string) {
  "use cache: remote";
  cacheTag(settingsTag(userId));
  cacheLife("days");
  const { rows } = await tables.settings.list({ queries: (q) => [q.equal("ownerId", userId), q.select(["logo"]), q.limit(1)] });
  return rows[0]?.logo ?? "";
}

async function cachedMenu(userId: string) {
  "use cache: remote";
  cacheTag(menuTag(userId));
  cacheLife("days");
  return readMenu(userId);
}

/** The logo printed at the top of bills, as a data URL, or "" when none is uploaded. */
export const getLogo = cache(async () => {
  const user = await requireUser();
  return cachedLogo(user.id);
});

export const getSettings = cache(async () => {
  const user = await requireUser();
  return cachedSettings(user.id);
});

export const getMenu = cache(async () => {
  const user = await requireUser();
  return cachedMenu(user.id);
});

/** The menu read straight from the database, for actions that change it. */
export async function getMenuFresh() {
  const user = await requireUser();
  return readMenu(user.id);
}

async function readMenu(userId: string): Promise<{ categories: Category[]; items: MenuItem[] }> {
  const user = { id: userId };
  const [cats, items] = await Promise.all([
    tables.categories.list({ queries: (q) => [q.equal("ownerId", user.id), q.orderAsc("sortOrder"), q.limit(200)] }),
    tables.items.list({ queries: (q) => [q.equal("ownerId", user.id), q.orderAsc("sortOrder"), q.limit(1000)] }),
  ]);
  return {
    categories: cats.rows.map((c) => ({ id: c.$id, name: c.name, sortOrder: c.sortOrder ?? 0 })),
    items: items.rows.map(toMenuItem),
  };
}

export const INVOICES_PAGE_SIZE = 25;

/** Search and date range for the Bills list and its CSV export. Dates are IST calendar days, both inclusive. */
export type BillFilter = { q?: string; from?: string; to?: string };

function filterQueries(qb: QueryBuilder<Invoices>, ownerId: string, f: BillFilter) {
  const q = f.q?.trim();
  const from = parseYmd(f.from);
  const to = parseYmd(f.to);
  return [
    qb.equal("ownerId", ownerId),
    ...(q ? [qb.or(qb.contains("number", q), qb.contains("customerName", q), qb.contains("customerPhone", q))] : []),
    ...(from ? [qb.greaterThanEqual("issuedAt", istDayStart(from))] : []),
    ...(to ? [qb.lessThan("issuedAt", istDayStart(to, 1))] : []),
  ];
}

export async function listInvoices(opts: BillFilter & { page?: number } = {}) {
  const user = await requireUser();
  const page = Math.max(1, opts.page ?? 1);
  const res = await tables.invoices.list({
    queries: (qb) => [...filterQueries(qb, user.id, opts), qb.orderDesc("issuedAt"), qb.limit(INVOICES_PAGE_SIZE), qb.offset((page - 1) * INVOICES_PAGE_SIZE)],
  });
  return { invoices: res.rows.map(toInvoiceDoc), total: res.total, page };
}

/** Upper bound on bills read for one export or range summary (about a year of a busy counter). */
export const EXPORT_LIMIT = 50_000;

/** Every bill matching the filter, oldest first, read in pages with a cursor. */
export async function allInvoices(f: BillFilter) {
  const user = await requireUser();
  const out: Invoices[] = [];
  let cursor: string | undefined;
  while (out.length < EXPORT_LIMIT) {
    const res = await tables.invoices.list({
      queries: (qb) => [...filterQueries(qb, user.id, f), qb.orderAsc("issuedAt"), qb.limit(1000), ...(cursor ? [qb.cursorAfter(cursor)] : [])],
    });
    out.push(...res.rows);
    if (res.rows.length < 1000) break;
    cursor = res.rows[res.rows.length - 1].$id;
  }
  return out.map(toInvoiceDoc);
}

/** Bill count, takings and GST for a filtered range, shown above the list when a date range is set. */
export async function summarizeInvoices(f: BillFilter) {
  const bills = await allInvoices(f);
  const sum = (k: "total" | "cgst" | "sgst") => Math.round(bills.reduce((s, b) => s + b[k] * 100, 0)) / 100;
  return { count: bills.length, total: sum("total"), gst: Math.round((sum("cgst") + sum("sgst")) * 100) / 100 };
}

export async function getInvoice(id: string) {
  const user = await requireUser();
  try {
    const row = await tables.invoices.get(id);
    return row.ownerId === user.id ? toInvoiceDoc(row) : null;
  } catch {
    return null;
  }
}

export type ItemsChange = { added: LineChange[]; removed: LineChange[]; fromTotal: number; toTotal: number };
export type BillEvent =
  | { id: string; at: string; type: "layout"; from: string; to: string }
  | { id: string; at: string; type: "items"; change: ItemsChange }
  | { id: string; at: string; type: "status"; from: string; to: string; split: PaymentSplit };

const parseChange = (json?: string | null): ItemsChange => {
  try {
    const v = JSON.parse(json || "{}");
    return { added: Array.isArray(v.added) ? v.added : [], removed: Array.isArray(v.removed) ? v.removed : [], fromTotal: Number(v.fromTotal) || 0, toTotal: Number(v.toTotal) || 0 };
  } catch {
    return { added: [], removed: [], fromTotal: 0, toTotal: 0 };
  }
};

/** Everything done to a saved bill after it was issued (layout, items, payment), oldest first. Scoped to the signed-in owner. */
export async function getInvoiceHistory(invoiceId: string): Promise<BillEvent[]> {
  const user = await requireUser();
  const res = await tables.invoiceEvents.list({
    queries: (q) => [q.equal("ownerId", user.id), q.equal("invoiceId", invoiceId), q.orderAsc("at"), q.limit(200)],
  });
  return res.rows.map((r): BillEvent => {
    const type = r.type ?? "layout";
    if (type === "items") return { id: r.$id, at: r.at, type, change: parseChange(r.detail) };
    if (type === "status") return { id: r.$id, at: r.at, type, from: r.from ?? "", to: r.to ?? "", split: parseSplit(r.detail) };
    return { id: r.$id, at: r.at, type, from: r.from ?? "", to: r.to ?? "" };
  });
}

export type TodayBill = { id: string; number: string; issuedAt: string; customerName: string; tableNo: string; paymentMode: PaymentMode; paymentSplit: PaymentSplit; status: PaymentStatus; total: number };

const addMoney = (a: number, b: number) => Math.round((a + b) * 100) / 100;

/** Today's bills (IST): what's been collected, split by payment mode for the cash drawer, and what's still due. */
export const getTodayStats = cache(async () => {
  const user = await requireUser();
  const since = startOfTodayIST();
  const res = await tables.invoices.list({
    queries: (q) => [
      q.equal("ownerId", user.id),
      q.greaterThanEqual("issuedAt", since),
      q.orderDesc("issuedAt"),
      q.select(["$id", "number", "issuedAt", "customerName", "tableNo", "paymentMode", "paymentSplit", "status", "total", "lines"]),
      q.limit(5000),
    ],
  });
  const bills: TodayBill[] = res.rows.map((r) => ({
    id: r.$id,
    number: r.number,
    issuedAt: r.issuedAt,
    customerName: r.customerName ?? "",
    tableNo: r.tableNo ?? "",
    paymentMode: r.paymentMode ?? "cash",
    paymentSplit: parseSplit(r.paymentSplit),
    status: r.status ?? "paid",
    total: r.total ?? 0,
  }));
  const revenue = bills.reduce((s, b) => addMoney(s, b.total), 0);
  const paid = bills.filter((b) => b.status === "paid");
  const due = bills.filter((b) => b.status === "due");
  // A mixed bill adds each of its parts to that part's own line, so cash here is the cash that reached the drawer.
  const byPayment = new Map<Tender, { count: number; amount: number }>();
  for (const b of paid) {
    for (const [tender, amount] of tenders(b)) {
      const e = byPayment.get(tender) ?? { count: 0, amount: 0 };
      byPayment.set(tender, { count: e.count + 1, amount: addMoney(e.amount, amount) });
    }
  }
  const counts = new Map<string, number>();
  for (const r of res.rows) {
    try {
      for (const l of JSON.parse(r.lines || "[]") as { name: string; qty: number }[]) counts.set(l.name, (counts.get(l.name) ?? 0) + l.qty);
    } catch {}
  }
  const topItems = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    bills,
    revenue,
    collected: paid.reduce((s, b) => addMoney(s, b.total), 0),
    due: { count: due.length, amount: due.reduce((s, b) => addMoney(s, b.total), 0) },
    average: bills.length ? revenue / bills.length : 0,
    byPayment: [...byPayment.entries()].sort((a, b) => b[1].amount - a[1].amount),
    topItems,
  };
});
