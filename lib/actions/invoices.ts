"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { AppwriteException, Query } from "node-appwrite";
import { tables } from "../appwrite/server";
import { requireUser } from "../auth";
import { getSettingsFor, linesRevision, toBusiness, toInvoiceDoc, toMenuItem } from "../data";
import {
  computeTotals,
  diffLines,
  financialYear,
  formatInvoiceNumber,
  lineUnitPrice,
  GSTIN_RE,
  type BilledLine,
  type CartLineInput,
  type DiscountType,
  type OrderType,
  type PaymentMode,
  type PaymentStatus,
} from "../billing";
import { TEMPLATE_IDS } from "../templates";

export type NewInvoiceInput = {
  lines: CartLineInput[];
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  orderType: OrderType;
  tableNo: string;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  discountType: DiscountType;
  discountValue: number;
  templateId: string;
  notes: string;
  /** Open the saved bill with the kitchen slip already printing. */
  printSlip?: boolean;
};

export type EditInvoiceInput = Omit<NewInvoiceInput, "status" | "paymentMode" | "templateId" | "printSlip"> & {
  /** linesRevision() of the bill as it was when the edit was opened. */
  basedOn?: string;
};

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const ORDER_TYPES = ["dine_in", "takeaway", "delivery"] as const;
const PAYMENT_MODES = ["cash", "upi", "card", "other"] as const;

/**
 * Turns what the counter sent into billed lines. Menu lines are re-priced from the menu on the server;
 * the client only sends references. Lines already on a saved bill keep the price they were billed at.
 */
async function priceLines(userId: string, input: CartLineInput[], saved: BilledLine[] = []): Promise<{ lines: BilledLine[] } | { error: string }> {
  if (!Array.isArray(input) || input.length === 0) return { error: "Add at least one item." };
  const menuIds = [...new Set(input.filter((l) => l.kind === "menu").map((l) => (l as { itemId: string }).itemId))];
  const menuRows = menuIds.length
    ? (await tables.items.list({ queries: (q) => [q.equal("ownerId", userId), Query.equal("$id", menuIds), q.limit(menuIds.length)] })).rows
    : [];
  const menu = new Map(menuRows.map((r) => [r.$id, toMenuItem(r)]));

  const lines: BilledLine[] = [];
  const usedSaved = new Set<number>();
  for (const l of input.slice(0, 200)) {
    const qty = Math.min(999, Math.max(1, Math.floor(Number(l.qty) || 1)));
    if (l.kind === "billed") {
      const was = saved[l.index];
      if (!was || usedSaved.has(l.index)) continue;
      usedSaved.add(l.index);
      lines.push({ ...was, qty, amount: Math.round(was.unitPrice * qty * 100) / 100 });
      continue;
    }
    if (l.kind === "custom") {
      const name = clip(l.name, 128);
      const price = Math.max(0, Number(l.price) || 0);
      if (!name || price <= 0) continue;
      lines.push({ name, addons: [], unitPrice: price, qty, amount: Math.round(price * qty * 100) / 100 });
      continue;
    }
    const item = menu.get(l.itemId);
    if (!item) return { error: "An item in this bill was removed from the menu. Remove it and try again." };
    const variant = l.variantId ? item.variants.find((v) => v.id === l.variantId) : undefined;
    if (item.variants.length && !variant) return { error: `Pick a size for ${item.name}.` };
    const addonIds = Array.isArray(l.addonIds) ? l.addonIds : [];
    const unitPrice = lineUnitPrice(item, variant?.id, addonIds);
    lines.push({
      itemId: item.id,
      name: item.name,
      variant: variant?.name,
      addons: item.addons.filter((a) => addonIds.includes(a.id)).map((a) => ({ name: a.name, price: a.price })),
      diet: item.diet,
      unitPrice,
      qty,
      amount: Math.round(unitPrice * qty * 100) / 100,
      note: clip(l.note, 120) || undefined,
    });
  }
  if (!lines.length) return { error: "Add at least one item." };
  return { lines };
}

/** Guest and order details shared by new and edited bills. Dine-in bills need a table so the food reaches the right one. */
type OrderDetails = { customerName: string; customerPhone: string; customerGstin: string; customerAddress: string; orderType: OrderType; tableNo: string; notes: string };

function orderDetails(input: EditInvoiceInput): { error: string } | { fields: OrderDetails } {
  const orderType = ORDER_TYPES.includes(input.orderType) ? input.orderType : "dine_in";
  const tableNo = orderType === "dine_in" ? clip(input.tableNo, 16) : "";
  if (orderType === "dine_in" && !tableNo) return { error: "Enter the table number." };
  const customerGstin = clip(input.customerGstin, 15).toUpperCase();
  if (customerGstin && !GSTIN_RE.test(customerGstin)) return { error: "The customer's GSTIN doesn't look valid." };
  return {
    fields: {
      customerName: clip(input.customerName, 128),
      customerPhone: clip(input.customerPhone, 20),
      customerGstin,
      customerAddress: clip(input.customerAddress, 512),
      orderType,
      tableNo,
      notes: clip(input.notes, 512),
    },
  };
}

const discountOf = (input: Pick<EditInvoiceInput, "discountType" | "discountValue">) => ({
  discountType: (input.discountType === "percent" ? "percent" : "flat") as DiscountType,
  discountValue: Math.max(0, Number(input.discountValue) || 0),
});

export async function createInvoice(input: NewInvoiceInput): Promise<{ error: string } | void> {
  const user = await requireUser();
  const settings = await getSettingsFor(user.id);
  if (!settings) return { error: "Set up your cafe details in Settings before billing." };
  const details = orderDetails(input);
  if ("error" in details) return details;
  const priced = await priceLines(user.id, input.lines);
  if ("error" in priced) return priced;
  const { lines } = priced;

  const discount = discountOf(input);
  const totals = computeTotals({ lines, ...discount, taxMode: settings.taxMode, gstRate: settings.gstRate, pricesIncludeTax: settings.pricesIncludeTax });

  const now = new Date();
  const fy = financialYear(now);
  const status: PaymentStatus = input.status === "paid" ? "paid" : "due";
  const base = {
    ownerId: user.id,
    fy,
    issuedAt: now.toISOString(),
    ...details.fields,
    paymentMode: PAYMENT_MODES.includes(input.paymentMode) ? input.paymentMode : "cash",
    status,
    ...(status === "paid" ? { paidAt: now.toISOString() } : {}),
    templateId: TEMPLATE_IDS.includes(input.templateId) ? input.templateId : settings.defaultTemplate,
    lines: JSON.stringify(lines),
    ...discount,
    ...totals,
    taxMode: settings.taxMode,
    gstRate: settings.taxMode === "regular" ? settings.gstRate : 0,
    pricesIncludeTax: settings.pricesIncludeTax,
    business: JSON.stringify(toBusiness(settings)),
  };

  // Serial numbers must be unique and consecutive within the financial year. The unique
  // (ownerId, fy, seq) index rejects a duplicate if two counters bill at the same instant; retry.
  let id = "";
  for (let attempt = 0; attempt < 5 && !id; attempt++) {
    const last = await tables.invoices.list({
      queries: (q) => [q.equal("ownerId", user.id), q.equal("fy", fy), q.orderDesc("seq"), q.select(["seq"]), q.limit(1)],
    });
    const seq = (last.rows[0]?.seq ?? 0) + 1;
    try {
      const row = await tables.invoices.create({ ...base, seq, number: formatInvoiceNumber(settings.invoicePrefix, fy, seq) });
      id = row.$id;
    } catch (e) {
      if (!(e instanceof AppwriteException && e.code === 409)) throw e;
    }
  }
  if (!id) return { error: "Couldn't assign an invoice number. Please try again." };
  redirect(`/invoices/${id}?new=1${input.printSlip ? "&kot=1" : ""}`);
}

async function ownedInvoice(userId: string, id: string) {
  const row = await tables.invoices.get(id).catch(() => null);
  return row && row.ownerId === userId ? row : null;
}

/**
 * Adds or removes items on a saved bill, and updates its guest details and discount.
 * The bill keeps its number, date, tax rate and the prices its lines were billed at.
 * A change to the items is recorded in the bill's history; if that record can't be written, the bill is put back.
 */
export async function updateInvoice(id: string, input: EditInvoiceInput): Promise<{ error: string } | void> {
  const user = await requireUser();
  const row = await ownedInvoice(user.id, id);
  if (!row) return { error: "This bill no longer exists." };
  const doc = toInvoiceDoc(row);
  if (input.basedOn !== linesRevision(doc.lines))
    return { error: "This bill's items changed since you opened it, so nothing was saved. Reload the page to edit the latest version." };
  const details = orderDetails(input);
  if ("error" in details) return details;
  const priced = await priceLines(user.id, input.lines, doc.lines);
  if ("error" in priced) return priced;
  const { lines } = priced;

  const discount = discountOf(input);
  const totals = computeTotals({ lines, ...discount, taxMode: doc.taxMode, gstRate: doc.gstRate, pricesIncludeTax: doc.pricesIncludeTax });
  const { added, removed } = diffLines(doc.lines, lines);

  const before = {
    lines: row.lines,
    customerName: row.customerName ?? "",
    customerPhone: row.customerPhone ?? "",
    customerGstin: row.customerGstin ?? "",
    customerAddress: row.customerAddress ?? "",
    orderType: row.orderType ?? "dine_in",
    tableNo: row.tableNo ?? "",
    notes: row.notes ?? "",
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    subtotal: doc.subtotal,
    discount: doc.discount,
    taxable: doc.taxable,
    cgst: doc.cgst,
    sgst: doc.sgst,
    roundOff: doc.roundOff,
    total: doc.total,
    pricesIncludeTax: doc.pricesIncludeTax,
  };
  await tables.invoices.update(id, { ...details.fields, lines: JSON.stringify(lines), ...discount, ...totals, pricesIncludeTax: doc.pricesIncludeTax });

  const itemsChanged = added.length > 0 || removed.length > 0;
  if (itemsChanged || totals.total !== doc.total) {
    try {
      await tables.invoiceEvents.create({
        ownerId: user.id,
        invoiceId: id,
        type: "items",
        at: new Date().toISOString(),
        detail: JSON.stringify({ added, removed, fromTotal: doc.total, toTotal: totals.total }),
      });
    } catch (e) {
      // An edit with no record is worse than no edit: put the bill back as it was.
      await tables.invoices.update(id, before).catch(() => {});
      throw e;
    }
  }
  refresh();
  redirect(`/invoices/${id}${itemsChanged ? "?kot=changes" : ""}`);
}

/** Marks a due bill paid by the given mode, or a paid bill due again (to undo a wrong tap). Recorded in the bill's history. */
export async function setInvoiceStatus(id: string, status: PaymentStatus, paymentMode?: PaymentMode) {
  const user = await requireUser();
  const row = await ownedInvoice(user.id, id);
  if (!row) return;
  const was = { status: row.status ?? "paid", paymentMode: row.paymentMode ?? "cash", paidAt: row.paidAt ?? null };
  const mode = paymentMode && PAYMENT_MODES.includes(paymentMode) ? paymentMode : was.paymentMode;
  if (was.status === status && (status === "due" || mode === was.paymentMode)) return;
  const now = new Date().toISOString();
  await tables.invoices.update(id, status === "paid" ? { status, paymentMode: mode, paidAt: now } : { status, paidAt: null as unknown as string });
  try {
    await tables.invoiceEvents.create({
      ownerId: user.id,
      invoiceId: id,
      type: "status",
      from: was.status === "paid" ? `paid:${was.paymentMode}` : "due",
      to: status === "paid" ? `paid:${mode}` : "due",
      at: now,
    });
  } catch (e) {
    await tables.invoices.update(id, was as never).catch(() => {});
    throw e;
  }
  refresh();
}

/**
 * Changes the layout a saved bill prints with, and records the change in the bill's history.
 * Only the presentation changes; amounts and numbering stay as issued.
 */
export async function setInvoiceTemplate(id: string, templateId: string) {
  const user = await requireUser();
  if (!TEMPLATE_IDS.includes(templateId)) return;
  const row = await ownedInvoice(user.id, id);
  if (!row || row.templateId === templateId) return;
  const from = row.templateId ?? "classic";
  await tables.invoices.update(id, { templateId });
  try {
    await tables.invoiceEvents.create({ ownerId: user.id, invoiceId: id, type: "layout", from, to: templateId, at: new Date().toISOString() });
  } catch (e) {
    // A change with no record is worse than no change: put the old layout back.
    await tables.invoices.update(id, { templateId: from }).catch(() => {});
    throw e;
  }
  refresh();
}

export async function deleteInvoice(id: string) {
  const user = await requireUser();
  const row = await ownedInvoice(user.id, id);
  if (row) {
    await tables.invoices.delete(id);
    // The history belongs to the bill; remove it with the bill.
    const events = await tables.invoiceEvents.list({ queries: (q) => [q.equal("ownerId", user.id), q.equal("invoiceId", id), q.select(["$id"]), q.limit(500)] });
    await Promise.all(events.rows.map((e) => tables.invoiceEvents.delete(e.$id)));
  }
  refresh();
  redirect("/invoices");
}
