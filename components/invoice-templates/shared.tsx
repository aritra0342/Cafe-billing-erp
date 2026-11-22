import {
  COMPOSITION_DECLARATION,
  ORDER_TYPE_LABEL,
  PAYMENT_LABEL,
  paymentLabel,
  SAC_RESTAURANT,
  amountInWords,
  documentTitle,
  formatAmount,
  formatDate,
  formatTime,
  stateName,
  type BilledLine,
  type InvoiceDoc,
} from "@/lib/billing";

export type TemplateProps = { doc: InvoiceDoc; qr?: string | null };

export { COMPOSITION_DECLARATION, ORDER_TYPE_LABEL, PAYMENT_LABEL, paymentLabel, SAC_RESTAURANT, amountInWords, documentTitle, formatAmount, formatDate, formatTime, stateName };

/** The café's uploaded logo, if any. Sized by the template; object-contain keeps wide and square logos whole. */
export function Logo({ doc, className = "" }: { doc: InvoiceDoc; className?: string }) {
  const src = doc.business.logo;
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${doc.business.cafeName} logo`} className={`block object-contain ${className}`} />;
}

export const lineDetail = (l: Pick<BilledLine, "variant" | "addons">) => [l.variant, ...l.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(", ");

export function addressLines(doc: InvoiceDoc) {
  const b = doc.business;
  const cityLine = [b.city, b.pincode].filter(Boolean).join(" – ");
  return [b.address, [cityLine, stateName(b.stateCode)].filter(Boolean).join(", ")].filter(Boolean);
}

export function placeOfSupply(doc: InvoiceDoc) {
  const code = doc.business.stateCode;
  return code ? `${stateName(code)} (${code})` : "";
}

/** The rows of the totals block, shared by every template so the maths reads the same everywhere. */
export function totalRows(doc: InvoiceDoc) {
  const half = doc.gstRate / 2;
  const rows: { label: string; value: number; strong?: boolean; negative?: boolean }[] = [{ label: "Subtotal", value: doc.subtotal }];
  if (doc.discount > 0) rows.push({ label: doc.discountType === "percent" ? `Discount (${doc.discountValue}%)` : "Discount", value: doc.discount, negative: true });
  if (doc.taxMode === "regular") {
    rows.push({ label: "Taxable value", value: doc.taxable });
    rows.push({ label: `CGST @ ${half}%`, value: doc.cgst });
    rows.push({ label: `SGST @ ${half}%`, value: doc.sgst });
  }
  if (doc.roundOff !== 0) rows.push({ label: "Round off", value: doc.roundOff });
  return rows;
}

export const signed = (r: { value: number; negative?: boolean }) => (r.negative ? `− ${formatAmount(r.value)}` : r.value < 0 ? `− ${formatAmount(-r.value)}` : formatAmount(r.value));
