import "server-only";
import QRCode from "qrcode";
import { upiLink, type InvoiceDoc } from "./billing";

/** UPI "scan & pay" QR for the bill total, as a data URL. Null when the cafe has no UPI ID. */
export async function upiQr(doc: Pick<InvoiceDoc, "business" | "total" | "number">) {
  if (!doc.business.upiId || doc.total <= 0) return null;
  return QRCode.toDataURL(upiLink(doc.business, doc.total, doc.number), { margin: 0, width: 320, errorCorrectionLevel: "M" });
}
