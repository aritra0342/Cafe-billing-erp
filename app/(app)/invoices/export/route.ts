import { allInvoices, EXPORT_LIMIT } from "@/lib/data";
import { IST, ORDER_TYPE_LABEL, PAYMENT_LABEL, STATUS_LABEL, documentTitle, istDateKey, parseYmd, stateName } from "@/lib/billing";
import { toCsv } from "@/lib/csv";

const HEADER = [
  "Invoice number",
  "Date",
  "Time",
  "Document",
  "Customer name",
  "Customer phone",
  "Customer GSTIN",
  "Place of supply",
  "Order type",
  "Table",
  "Status",
  "Payment mode",
  "Items",
  "Subtotal",
  "Discount",
  "Taxable value",
  "GST rate %",
  "CGST",
  "SGST",
  "Round off",
  "Total",
  "Notes",
];

const time = new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
const money = (n: number) => Number(n.toFixed(2));

/** Bills matching the Bills page filters, oldest first, as a CSV for the accountant or GST filing. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const filter = { q: sp.get("q") ?? "", from: parseYmd(sp.get("from")), to: parseYmd(sp.get("to")) };
  const bills = await allInvoices(filter);

  const rows = bills.map((b) => {
    const at = new Date(b.issuedAt);
    const regular = b.taxMode === "regular";
    return [
      b.number,
      istDateKey(at).split("-").reverse().join("-"), // dd-mm-yyyy, as the GST portal writes dates
      time.format(at),
      documentTitle(b.taxMode),
      b.customerName,
      b.customerPhone,
      b.customerGstin,
      b.business.stateCode ? `${b.business.stateCode}-${stateName(b.business.stateCode)}` : "",
      ORDER_TYPE_LABEL[b.orderType],
      b.tableNo,
      STATUS_LABEL[b.status],
      b.status === "paid" ? PAYMENT_LABEL[b.paymentMode] : "",
      b.lines.reduce((s, l) => s + l.qty, 0),
      money(b.subtotal),
      money(b.discount),
      money(b.taxable),
      regular ? b.gstRate : 0,
      money(b.cgst),
      money(b.sgst),
      money(b.roundOff),
      money(b.total),
      b.notes,
    ];
  });

  const range = filter.from || filter.to ? `${filter.from || "start"}-to-${filter.to || istDateKey()}` : `all-${istDateKey()}`;
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="bills-${range}.csv"`,
    "Cache-Control": "private, no-store",
  });
  if (bills.length >= EXPORT_LIMIT) headers.set("X-Export-Truncated", String(EXPORT_LIMIT));
  return new Response(toCsv([HEADER, ...rows]), { headers });
}
