"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { PHOTO_BUCKET, storage, tables } from "../appwrite/server";
import { requireUser } from "../auth";
import type { Diet, Option } from "../billing";
import { SAMPLE_MENU } from "../sample-menu";
import { getMenu } from "../data";
import { MAX_PHOTO_BYTES, imageKind } from "../photo";
import { MAX_SHEET_BYTES, planMenuImport, readMenuSheet, type ItemData, type MenuPlan } from "../menu-sheet";

type Result = { ok: true; id?: string } | { ok: false; error: string };

async function ownedCategory(userId: string, id: string) {
  const row = await tables.categories.get(id).catch(() => null);
  return row && row.ownerId === userId ? row : null;
}
async function ownedItem(userId: string, id: string) {
  const row = await tables.items.get(id).catch(() => null);
  return row && row.ownerId === userId ? row : null;
}

/** Removes photo files from storage. A file that's already gone is fine; a failure here never blocks the menu change. */
async function deletePhotoFiles(ids: (string | null | undefined)[]) {
  await Promise.all(
    ids.filter((id): id is string => Boolean(id)).map((fileId) =>
      storage.deleteFile({ bucketId: PHOTO_BUCKET, fileId }).catch((e) => {
        if (e?.code !== 404) console.error("menu photo: delete failed", fileId, e);
      }),
    ),
  );
}

const cleanOptions = (opts: Option[]) =>
  (Array.isArray(opts) ? opts : [])
    .map((o) => ({ id: String(o.id || ID.unique()).slice(0, 36), name: String(o.name ?? "").trim().slice(0, 64), price: Math.max(0, Number(o.price) || 0) }))
    .filter((o) => o.name)
    .slice(0, 30);

export async function createCategory(name: string): Promise<Result> {
  const user = await requireUser();
  const clean = name.trim().slice(0, 64);
  if (!clean) return { ok: false, error: "Give the category a name." };
  const existing = await tables.categories.list({ queries: (q) => [q.equal("ownerId", user.id), q.orderDesc("sortOrder"), q.limit(1)] });
  const row = await tables.categories.create(
    { ownerId: user.id, name: clean, sortOrder: (existing.rows[0]?.sortOrder ?? 0) + 1 },
  );
  refresh();
  return { ok: true, id: row.$id };
}

export async function renameCategory(id: string, name: string): Promise<Result> {
  const user = await requireUser();
  const clean = name.trim().slice(0, 64);
  if (!clean) return { ok: false, error: "Give the category a name." };
  if (!(await ownedCategory(user.id, id))) return { ok: false, error: "Category not found." };
  await tables.categories.update(id, { name: clean });
  refresh();
  return { ok: true };
}

export async function moveCategory(id: string, direction: -1 | 1): Promise<Result> {
  const user = await requireUser();
  const all = await tables.categories.list({ queries: (q) => [q.equal("ownerId", user.id), q.orderAsc("sortOrder"), q.limit(200)] });
  const i = all.rows.findIndex((c) => c.$id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= all.rows.length) return { ok: true };
  const order = all.rows.map((c) => c.$id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((cid, idx) => tables.categories.update(cid, { sortOrder: idx + 1 })));
  refresh();
  return { ok: true };
}

/** Deletes the category and every item in it. */
export async function deleteCategory(id: string): Promise<Result> {
  const user = await requireUser();
  if (!(await ownedCategory(user.id, id))) return { ok: false, error: "Category not found." };
  const items = await tables.items.list({ queries: (q) => [q.equal("ownerId", user.id), q.equal("categoryId", id), q.limit(1000)] });
  await Promise.all(items.rows.map((r) => tables.items.delete(r.$id)));
  await tables.categories.delete(id);
  await deletePhotoFiles(items.rows.map((r) => r.photo));
  refresh();
  return { ok: true };
}

export type ItemInput = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  diet: Diet;
  available: boolean;
  variants: Option[];
  addons: Option[];
  /** Shown in the editor only; photos are saved with setItemPhoto. */
  photo?: string;
};

export async function saveItem(input: ItemInput): Promise<Result> {
  const user = await requireUser();
  const name = String(input.name ?? "").trim().slice(0, 128);
  if (!name) return { ok: false, error: "Give the item a name." };
  if (!(await ownedCategory(user.id, input.categoryId))) return { ok: false, error: "Pick a category." };
  const variants = cleanOptions(input.variants);
  const addons = cleanOptions(input.addons);
  const price = variants.length ? Math.min(...variants.map((v) => v.price)) : Math.max(0, Number(input.price) || 0);
  if (!variants.length && price <= 0) return { ok: false, error: "Set a price, or add sizes with their own prices." };
  const data = {
    categoryId: input.categoryId,
    name,
    description: String(input.description ?? "").trim().slice(0, 512),
    price,
    diet: (["veg", "nonveg", "egg"] as const).includes(input.diet) ? input.diet : "veg",
    available: input.available !== false,
    variants: JSON.stringify(variants),
    addons: JSON.stringify(addons),
  };
  if (input.id) {
    if (!(await ownedItem(user.id, input.id))) return { ok: false, error: "Item not found." };
    await tables.items.update(input.id, data);
    refresh();
    return { ok: true, id: input.id };
  }
  const count = await tables.items.list({ queries: (q) => [q.equal("ownerId", user.id), q.equal("categoryId", input.categoryId), q.limit(1)] });
  const row = await tables.items.create({ ownerId: user.id, sortOrder: count.total + 1, ...data });
  refresh();
  return { ok: true, id: row.$id };
}

export async function setItemAvailable(id: string, available: boolean): Promise<Result> {
  const user = await requireUser();
  if (!(await ownedItem(user.id, id))) return { ok: false, error: "Item not found." };
  await tables.items.update(id, { available });
  refresh();
  return { ok: true };
}

export async function deleteItem(id: string): Promise<Result> {
  const user = await requireUser();
  const item = await ownedItem(user.id, id);
  if (!item) return { ok: false, error: "Item not found." };
  await tables.items.delete(id);
  await deletePhotoFiles([item.photo]);
  refresh();
  return { ok: true };
}

/**
 * Saves the item's photo (the browser has already cropped it square and shrunk it).
 * Each upload gets a new file id, so the photo's address changes and browsers can cache it forever.
 */
export async function setItemPhoto(id: string, form: FormData): Promise<Result> {
  const user = await requireUser();
  const item = await ownedItem(user.id, id);
  if (!item) return { ok: false, error: "Item not found." };
  const file = form.get("photo");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Choose a photo first." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "That photo is over 1 MB. Try a smaller one." };
  const kind = await imageKind(file);
  if (!kind) return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  const fileId = ID.unique();
  try {
    await storage.createFile({ bucketId: PHOTO_BUCKET, fileId, file: InputFile.fromBuffer(new Uint8Array(await file.arrayBuffer()), `${id}.${kind}`) });
  } catch (e) {
    console.error("menu photo: upload failed", e);
    return { ok: false, error: "The photo couldn't be saved just now. Try again in a minute." };
  }
  try {
    await tables.items.update(id, { photo: fileId });
  } catch (e) {
    await deletePhotoFiles([fileId]);
    throw e;
  }
  await deletePhotoFiles([item.photo]);
  refresh();
  return { ok: true, id: fileId };
}

export async function removeItemPhoto(id: string): Promise<Result> {
  const user = await requireUser();
  const item = await ownedItem(user.id, id);
  if (!item) return { ok: false, error: "Item not found." };
  if (!item.photo) return { ok: true };
  await tables.items.update(id, { photo: null as unknown as string });
  await deletePhotoFiles([item.photo]);
  refresh();
  return { ok: true };
}

/** Adds the built-in menu. Categories with the same name are reused and items already in them are skipped, so it fills in a half-set-up menu and running it twice adds nothing. */
export async function loadSampleMenu(): Promise<Result> {
  const user = await requireUser();
  const menu = await getMenu();
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  let order = Math.max(0, ...menu.categories.map((c) => c.sortOrder));
  for (const cat of SAMPLE_MENU) {
    const existing = menu.categories.find((c) => norm(c.name) === norm(cat.name));
    const categoryId = existing?.id ?? (await tables.categories.create({ ownerId: user.id, name: cat.name, sortOrder: ++order })).$id;
    const inCategory = menu.items.filter((i) => i.categoryId === categoryId);
    let sort = Math.max(0, ...inCategory.map((i) => i.sortOrder));
    const toAdd = cat.items.filter((it) => !inCategory.some((i) => norm(i.name) === norm(it.name)));
    await Promise.all(
      toAdd.map((it) =>
        tables.items.create({
          ownerId: user.id,
          categoryId,
          name: it.name,
          description: it.description ?? "",
          price: it.variants?.length ? Math.min(...it.variants.map((v) => v.price)) : it.price ?? 0,
          diet: it.diet ?? "veg",
          available: it.available ?? true,
          variants: JSON.stringify((it.variants ?? []).map((v) => ({ id: ID.unique(), ...v }))),
          addons: JSON.stringify((it.addons ?? []).map((a) => ({ id: ID.unique(), ...a }))),
          sortOrder: ++sort,
        }),
      ),
    );
  }
  refresh();
  return { ok: true };
}

// ---------- Excel ----------

export type SheetPreview = { ok: true; plan: MenuPlan } | { ok: false; error: string };
export type SheetApplied = { ok: true; added: number; changed: number; removed: number; categories: number } | { ok: false; error: string };

const sheetKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

async function planFromForm(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { error: "Choose the menu file (.xlsx or .csv) first." };
  if (file.size > MAX_SHEET_BYTES) return { error: "That file is over 1 MB. A menu sheet is usually under 50 KB; check it's the right file." };
  try {
    const [sheet, menu] = await Promise.all([readMenuSheet(file), getMenu()]);
    return { menu, ...planMenuImport(sheet, menu.categories, menu.items, () => ID.unique()) };
  } catch (e) {
    unstable_rethrow(e);
    console.error("menu sheet: planning failed", e);
    return { error: "The sheet couldn't be checked against your menu just now. Try uploading it again in a minute." };
  }
}

/** Reads the uploaded sheet and says what would change, without saving anything. */
export async function previewMenuSheet(form: FormData): Promise<SheetPreview> {
  await requireUser();
  const r = await planFromForm(form);
  return "error" in r ? { ok: false, error: r.error! } : { ok: true, plan: r.plan };
}

/** Re-reads the sheet against the menu as it is now, then saves. Uploading the same sheet twice changes nothing the second time. */
export async function applyMenuSheet(form: FormData): Promise<SheetApplied> {
  const user = await requireUser();
  const r = await planFromForm(form);
  if ("error" in r) return { ok: false, error: r.error! };
  const { menu, plan, ops } = r;
  const removeMissing = form.get("removeMissing") === "on";
  const row = (d: Omit<ItemData, "categoryId">) => ({ ...d, variants: JSON.stringify(d.variants), addons: JSON.stringify(d.addons) });
  const inBatches = async <T,>(list: T[], fn: (x: T) => Promise<unknown>) => {
    for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(fn));
  };

  try {
    const catIds = new Map(menu.categories.map((c) => [sheetKey(c.name), c.id]));
    let order = Math.max(0, ...menu.categories.map((c) => c.sortOrder));
    for (const name of ops.newCategories) {
      const c = await tables.categories.create({ ownerId: user.id, name, sortOrder: ++order });
      catIds.set(sheetKey(name), c.$id);
    }
    const catId = (name: string) => catIds.get(sheetKey(name))!;
    await inBatches(ops.updates, (u) => tables.items.update(u.id, { ...row(u.data), categoryId: catId(u.category) }));
    const counts = new Map<string, number>();
    for (const i of menu.items) counts.set(i.categoryId, Math.max(counts.get(i.categoryId) ?? 0, i.sortOrder));
    // `category` is the sheet's category name, not a column; sending it makes Appwrite reject the row.
    const creates = ops.creates.map(({ category, ...c }) => {
      const id = catId(category);
      counts.set(id, (counts.get(id) ?? 0) + 1);
      return { ownerId: user.id, categoryId: id, sortOrder: counts.get(id)!, ...row(c) };
    });
    await inBatches(creates, (c) => tables.items.create(c));
    if (removeMissing) {
      await inBatches(plan.missing, (m) => tables.items.delete(m.id));
      await deletePhotoFiles(plan.missing.map((m) => menu.items.find((i) => i.id === m.id)?.photo));
    }
  } catch (e) {
    console.error("menu sheet import failed", e);
    refresh();
    return { ok: false, error: "Saving stopped partway, so some changes are in and some aren't. Upload the same sheet again to finish; rows already saved won't be changed twice." };
  }
  refresh();
  return { ok: true, added: ops.creates.length, changed: ops.updates.length, removed: removeMissing ? plan.missing.length : 0, categories: ops.newCategories.length };
}
