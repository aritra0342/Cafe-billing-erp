// Pure billing logic shared by server and client. No I/O here.
// All money math happens in integer paise so totals never drift.

export type TaxMode = "regular" | "composition" | "unregistered";
export type Diet = "veg" | "nonveg" | "egg";
export type OrderType = "dine_in" | "takeaway" | "delivery";
/** "mixed" is a bill settled partly one way and partly another, such as some cash and the rest by UPI. */
export type PaymentMode = "cash" | "upi" | "card" | "other" | "mixed";
/** The ways money actually arrives. A mixed bill is made up of two or more of these. */
export type Tender = Exclude<PaymentMode, "mixed">;
export const TENDERS: Tender[] = ["cash", "upi", "card", "other"];
/** How much of a mixed bill came in by each tender, in rupees. Empty for a bill paid one way. */
export type PaymentSplit = Partial<Record<Tender, number>>;
export type DiscountType = "percent" | "flat";
/** A bill is saved as due when the order goes to the kitchen and marked paid when the guest settles it. */
export type PaymentStatus = "due" | "paid";

/** A sub-item of a menu item: a size/variant (replaces base price) or an add-on (added on top). */
export type Option = { id: string; name: string; price: number };

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  diet: Diet;
  available: boolean;
  variants: Option[];
  addons: Option[];
  sortOrder: number;
  /** Storage file id of the item's photo, or "" for none. Served by /menu/photo/[id]. */
  photo: string;
};

export type Category = { id: string; name: string; sortOrder: number };

/** What the cart sends to the server: references only, prices are re-read from the menu. */
export type CartLineInput =
  | { kind: "menu"; itemId: string; variantId?: string; addonIds: string[]; qty: number; note?: string }
  | { kind: "custom"; name: string; price: number; qty: number }
  /** A line already on a saved bill, kept at the price it was billed at. Used when editing a bill. */
  | { kind: "billed"; index: number; qty: number };

/** A billed line, frozen into the invoice so later menu edits don't rewrite history. */
export type BilledLine = {
  /** The menu item this line came from, so an edited bill can show its photo and add more of it. */
  itemId?: string;
  name: string;
  variant?: string;
  addons: { name: string; price: number }[];
  diet?: Diet;
  unitPrice: number; // base or variant price + add-ons, per unit
  qty: number;
  amount: number;
  note?: string;
};

export type Business = {
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
  upiId: string;
  footerNote: string;
  accentColor: string;
  /** Added when a bill is rendered, never stored on the bill itself. */
  logo?: string;
};

export type Totals = {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  total: number;
};

export type InvoiceDoc = {
  id: string;
  number: string;
  issuedAt: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  orderType: OrderType;
  tableNo: string;
  paymentMode: PaymentMode;
  /** The parts of a mixed payment; {} otherwise. They add up to the total. */
  paymentSplit: PaymentSplit;
  status: PaymentStatus;
  /** When the bill was marked paid; "" while it's due, and for bills saved before paid/due existed. */
  paidAt: string;
  templateId: string;
  lines: BilledLine[];
  discountType: DiscountType;
  discountValue: number;
  taxMode: TaxMode;
  gstRate: number;
  /** Whether menu prices included GST when the bill was made. Edits re-total the bill the same way. */
  pricesIncludeTax: boolean;
  business: Business;
  notes: string;
} & Totals;

export const SAC_RESTAURANT = "9963";

const toPaise = (rupees: number) => Math.round(rupees * 100);
const toRupees = (paise: number) => paise / 100;

export function lineUnitPrice(item: MenuItem, variantId: string | undefined, addonIds: string[]) {
  const variant = variantId ? item.variants.find((v) => v.id === variantId) : undefined;
  const base = variant ? variant.price : item.price;
  const extras = item.addons.filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + toPaise(a.price), 0);
  return toRupees(toPaise(base) + extras);
}

export function computeTotals(input: {
  lines: { unitPrice: number; qty: number }[];
  discountType: DiscountType;
  discountValue: number;
  taxMode: TaxMode;
  gstRate: number;
  pricesIncludeTax: boolean;
}): Totals {
  const subtotal = input.lines.reduce((s, l) => s + toPaise(l.unitPrice) * l.qty, 0);
  const rawDiscount =
    input.discountType === "percent"
      ? Math.round((subtotal * Math.min(Math.max(input.discountValue, 0), 100)) / 100)
      : toPaise(Math.max(input.discountValue, 0));
  const discount = Math.min(rawDiscount, subtotal);
  const net = subtotal - discount; // discount before tax: it reduces the taxable value

  let taxable = net;
  let cgst = 0;
  let sgst = 0;
  if (input.taxMode === "regular" && input.gstRate > 0) {
    if (input.pricesIncludeTax) {
      taxable = Math.round(net / (1 + input.gstRate / 100));
      const tax = net - taxable;
      cgst = Math.round(tax / 2);
      sgst = tax - cgst;
    } else {
      cgst = Math.round((taxable * input.gstRate) / 200);
      sgst = cgst;
    }
  }
  const gross = taxable + cgst + sgst;
  const total = Math.round(gross / 100) * 100; // bills are rounded to the rupee
  return {
    subtotal: toRupees(subtotal),
    discount: toRupees(discount),
    taxable: toRupees(taxable),
    cgst: toRupees(cgst),
    sgst: toRupees(sgst),
    roundOff: toRupees(total - gross),
    total: toRupees(total),
  };
}

// ---------- Formatting (always Indian conventions, always IST) ----------

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const inrPlain = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrShort = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatINR = (n: number) => inr.format(n);
export const formatAmount = (n: number) => inrPlain.format(n);
export const formatINRShort = (n: number) => inrShort.format(n);

export const IST = "Asia/Kolkata";
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));
export const formatDateTime = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;

/** Indian financial year (April–March) of an instant, in IST. e.g. "26-27". */
export function financialYear(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "numeric" }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const start = m >= 4 ? y : y - 1;
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * Rule 46 caps invoice numbers at 16 characters. PREFIX/26-27/0001 leaves 5 for the prefix;
 * past 9,999 bills a year the serial grows a digit and the prefix gives one up.
 */
export function formatInvoiceNumber(prefix: string, fy: string, seq: number) {
  const serial = String(seq).padStart(4, "0");
  const room = 16 - fy.length - serial.length - 2;
  return `${(prefix || "INV").slice(0, Math.max(1, room))}/${fy}/${serial}`;
}

/** Start of "today" in IST as a UTC ISO string. */
export function startOfTodayIST(now = new Date()) {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${d}T00:00:00+05:30`).toISOString();
}

/** The IST calendar date of an instant, as YYYY-MM-DD. */
export const istDateKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

/** Start of an IST calendar day (YYYY-MM-DD) as a UTC ISO string, optionally shifted by whole days. */
export const istDayStart = (ymd: string, addDays = 0) => new Date(new Date(`${ymd}T00:00:00+05:30`).getTime() + addDays * 86_400_000).toISOString();

/** Accepts only a real YYYY-MM-DD date; anything else is treated as no date. */
export function parseYmd(v: unknown) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  return Number.isNaN(new Date(`${v}T00:00:00+05:30`).getTime()) ? "" : v;
}

// ---------- Amount in words, Indian numbering (lakh, crore) ----------

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function belowThousand(n: number) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? belowHundred(r) : ""].filter(Boolean).join(" ");
}
function integerWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  return [
    crore ? `${integerWords(crore)} Crore` : "",
    lakh ? `${belowHundred(lakh)} Lakh` : "",
    thousand ? `${belowHundred(thousand)} Thousand` : "",
    rest ? belowThousand(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function amountInWords(amount: number) {
  const paise = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  return `Rupees ${integerWords(rupees)}${p ? ` and ${belowHundred(p)} Paise` : ""} Only`;
}

// ---------- India specifics ----------

export const STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];
export const stateName = (code: string) => STATES.find((s) => s.code === code)?.name ?? "";

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const FSSAI_RE = /^[0-9]{14}$/;

export const ORDER_TYPE_LABEL: Record<OrderType, string> = { dine_in: "Dine-in", takeaway: "Takeaway", delivery: "Delivery" };
export const PAYMENT_LABEL: Record<PaymentMode, string> = { cash: "Cash", upi: "UPI", card: "Card", other: "Other", mixed: "Mixed" };
export const STATUS_LABEL: Record<PaymentStatus, string> = { due: "Due", paid: "Paid" };

// ---------- Mixed payments ----------

/** Reads a split from the counter or from a saved bill, keeping only real, positive amounts. */
export function cleanSplit(v: unknown): PaymentSplit {
  const out: PaymentSplit = {};
  if (!v || typeof v !== "object") return out;
  for (const t of TENDERS) {
    const paise = toPaise(Number((v as Record<string, unknown>)[t]));
    if (Number.isFinite(paise) && paise > 0) out[t] = toRupees(paise);
  }
  return out;
}

export const splitTotal = (split: PaymentSplit) => toRupees(TENDERS.reduce((s, t) => s + toPaise(split[t] ?? 0), 0));

type Settled = Pick<InvoiceDoc, "paymentMode" | "paymentSplit" | "total">;

/** How a paid bill's total came in: one entry for a bill paid one way, one per part for a mixed bill. */
export function tenders(doc: Settled): [Tender, number][] {
  if (doc.paymentMode !== "mixed") return [[doc.paymentMode, doc.total]];
  const parts = TENDERS.filter((t) => (doc.paymentSplit[t] ?? 0) > 0).map((t): [Tender, number] => [t, doc.paymentSplit[t]!]);
  return parts.length ? parts : [["other", doc.total]];
}

const rupees = (n: number) => inr.format(n).replace(/\.00$/, "");

/** "UPI" for a bill paid one way; "Cash ₹200 + UPI ₹150" for a mixed one (or "Cash + UPI" without amounts). */
export function paidByLabel(doc: Settled, amounts = true) {
  if (doc.paymentMode !== "mixed") return PAYMENT_LABEL[doc.paymentMode];
  return tenders(doc)
    .map(([t, n]) => (amounts ? `${PAYMENT_LABEL[t]} ${rupees(n)}` : PAYMENT_LABEL[t]))
    .join(" + ");
}

/**
 * Keeps a mixed bill's parts adding up after an edit changes its total. Cash takes the difference first
 * (it's how change is given or the extra collected), then UPI, card and other if cash runs out.
 */
export function rebalanceSplit(split: PaymentSplit, total: number): PaymentSplit {
  const paise = Object.fromEntries(TENDERS.map((t) => [t, toPaise(split[t] ?? 0)])) as Record<Tender, number>;
  let diff = toPaise(total) - TENDERS.reduce((s, t) => s + paise[t], 0);
  if (diff > 0) paise.cash += diff;
  for (const t of TENDERS) {
    if (diff >= 0) break;
    const take = Math.min(paise[t], -diff);
    paise[t] -= take;
    diff += take;
  }
  return cleanSplit(Object.fromEntries(TENDERS.map((t) => [t, toRupees(paise[t])])));
}

/** What a bill says about payment: "Payment due" until it's settled, then how it was paid. */
export const paymentLabel = (doc: Settled & Pick<InvoiceDoc, "status">) => (doc.status === "due" ? "Payment due" : paidByLabel(doc));

/** Lines that are the same dish made the same way, so they can be compared across two versions of a bill. */
export const lineKey = (l: BilledLine) =>
  [l.name, l.variant ?? "", l.addons.map((a) => a.name).sort().join("+"), l.note ?? "", toPaise(l.unitPrice)].join("|");

export type LineChange = Pick<BilledLine, "name" | "variant" | "addons" | "note"> & { qty: number };

/** What the kitchen needs to hear about an edit: dishes added and dishes cancelled, with quantities. */
export function diffLines(before: BilledLine[], after: BilledLine[]) {
  const tally = (lines: BilledLine[]) => {
    const m = new Map<string, { line: BilledLine; qty: number }>();
    for (const l of lines) {
      const k = lineKey(l);
      m.set(k, { line: l, qty: (m.get(k)?.qty ?? 0) + l.qty });
    }
    return m;
  };
  const was = tally(before);
  const now = tally(after);
  const pick = ({ name, variant, addons, note }: BilledLine, qty: number): LineChange => ({ name, ...(variant ? { variant } : {}), addons: addons.map((a) => ({ name: a.name, price: a.price })), ...(note ? { note } : {}), qty });
  const added: LineChange[] = [];
  const removed: LineChange[] = [];
  for (const [k, n] of now) {
    const d = n.qty - (was.get(k)?.qty ?? 0);
    if (d > 0) added.push(pick(n.line, d));
  }
  for (const [k, w] of was) {
    const d = w.qty - (now.get(k)?.qty ?? 0);
    if (d > 0) removed.push(pick(w.line, d));
  }
  return { added, removed };
}

/**
 * Works out from a saved bill's own totals whether its prices included GST.
 * Bills saved before this was stored on the bill don't carry the flag.
 */
export function inferPricesIncludeTax(t: Pick<Totals, "subtotal" | "discount" | "taxable">, taxMode: TaxMode, gstRate: number) {
  if (taxMode !== "regular" || gstRate <= 0) return false;
  return toPaise(t.taxable) < toPaise(t.subtotal) - toPaise(t.discount);
}

export function documentTitle(taxMode: TaxMode) {
  return taxMode === "regular" ? "Tax Invoice" : taxMode === "composition" ? "Bill of Supply" : "Invoice";
}
export const COMPOSITION_DECLARATION = "Composition taxable person, not eligible to collect tax on supplies.";

export function upiLink(b: Pick<Business, "upiId" | "cafeName">, amount: number, ref: string) {
  const q = new URLSearchParams({ pa: b.upiId, pn: b.cafeName, am: amount.toFixed(2), cu: "INR", tn: ref });
  return `upi://pay?${q.toString()}`;
}
