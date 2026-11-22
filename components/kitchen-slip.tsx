import { ORDER_TYPE_LABEL, formatDate, formatTime, type InvoiceDoc, type LineChange } from "@/lib/billing";
import { lineDetail } from "./invoice-templates/shared";

/** "INV/26-27/0042" -> "42": the short number the kitchen calls out. */
export const orderNumber = (billNumber: string) => String(Number(billNumber.match(/(\d+)\D*$/)?.[1] ?? "") || billNumber);

/**
 * Kitchen order ticket: order number, date and time, and what to make. No prices.
 * Big bold type because it's read at arm's length on a busy pass.
 * Rendered off screen on the bill page and printed by its own button (see globals.css).
 */
export function KitchenSlip({ doc, paper }: { doc: InvoiceDoc; paper: "80mm" | "58mm" }) {
  const narrow = paper === "58mm";
  const count = doc.lines.reduce((s, l) => s + l.qty, 0);
  return (
    <div aria-hidden data-kind="full" className="kitchen-slip bg-white text-black" style={{ width: paper, fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.3 }}>
      <div className={narrow ? "px-[2mm] py-[3mm]" : "px-[4mm] py-[4mm]"}>
        <p className="text-center text-[9pt] font-bold tracking-[0.15em] uppercase">Kitchen order</p>
        <div className="mt-[2mm] flex items-end justify-between gap-[2mm] border-y-2 border-black py-[2mm]">
          <div>
            <p className="text-[8pt]">Order no.</p>
            <p className={`${narrow ? "text-[22pt]" : "text-[28pt]"} leading-none font-black tabular-nums`}>{orderNumber(doc.number)}</p>
          </div>
          <div className="text-right text-[10pt] font-bold">
            <p>{ORDER_TYPE_LABEL[doc.orderType]}</p>
            {doc.orderType === "dine_in" && doc.tableNo && <p className={`${narrow ? "text-[13pt]" : "text-[16pt]"} leading-tight`}>Table {doc.tableNo}</p>}
          </div>
        </div>
        <p className="mt-[1.5mm] flex justify-between text-[10.5pt] font-bold tabular-nums">
          <span>{formatDate(doc.issuedAt)}</span>
          <span>{formatTime(doc.issuedAt)}</span>
        </p>
        <p className="text-[8pt]">
          Bill {doc.number}
          {doc.customerName ? `, ${doc.customerName}` : ""}
        </p>

        <table className="mt-[2mm] w-full border-collapse border-t-2 border-black">
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i} className="border-b border-dashed border-black align-top">
                <td className={`${narrow ? "w-[9mm] text-[12pt]" : "w-[12mm] text-[14pt]"} py-[1.5mm] pr-[1.5mm] font-black tabular-nums`}>{l.qty}×</td>
                <td className={`${narrow ? "text-[10.5pt]" : "text-[12pt]"} py-[1.5mm] leading-tight font-bold`}>
                  {l.name}
                  {lineDetail(l) && <span className={`block font-normal ${narrow ? "text-[9pt]" : "text-[10pt]"}`}>{lineDetail(l)}</span>}
                  {l.note && <span className={`block italic ${narrow ? "text-[9pt]" : "text-[10pt]"}`}>Note: {l.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {doc.notes && <p className="mt-[2mm] border-2 border-black p-[1.5mm] text-[11pt] font-bold">Note: {doc.notes}</p>}
        <p className="mt-[2mm] text-center text-[9pt] font-bold">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}

/**
 * Slip for an edited order: only what to start making and what to stop, so the kitchen doesn't cook the order twice.
 * Cancelled dishes print under a black band so they can't be missed.
 */
export function ChangeSlip({ doc, paper, added, removed, at }: { doc: InvoiceDoc; paper: "80mm" | "58mm"; added: LineChange[]; removed: LineChange[]; at: string }) {
  const narrow = paper === "58mm";
  const qtyCell = `${narrow ? "w-[9mm] text-[12pt]" : "w-[12mm] text-[14pt]"} py-[1.5mm] pr-[1.5mm] font-black tabular-nums`;
  const nameCell = `${narrow ? "text-[10.5pt]" : "text-[12pt]"} py-[1.5mm] leading-tight font-bold`;
  const rows = (lines: LineChange[], cancelled: boolean) => (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-b border-dashed border-black align-top">
            <td className={qtyCell}>
              {cancelled ? "−" : "+"}
              {l.qty}
            </td>
            <td className={nameCell}>
              <span className={cancelled ? "line-through decoration-2" : ""}>{l.name}</span>
              {lineDetail(l) && <span className={`block font-normal ${narrow ? "text-[9pt]" : "text-[10pt]"}`}>{lineDetail(l)}</span>}
              {l.note && <span className={`block italic ${narrow ? "text-[9pt]" : "text-[10pt]"}`}>Note: {l.note}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <div aria-hidden data-kind="changes" className="kitchen-slip bg-white text-black" style={{ width: paper, fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.3 }}>
      <div className={narrow ? "px-[2mm] py-[3mm]" : "px-[4mm] py-[4mm]"}>
        <p className="text-center text-[9pt] font-bold tracking-[0.15em] uppercase">Order changed</p>
        <div className="mt-[2mm] flex items-end justify-between gap-[2mm] border-y-2 border-black py-[2mm]">
          <div>
            <p className="text-[8pt]">Order no.</p>
            <p className={`${narrow ? "text-[22pt]" : "text-[28pt]"} leading-none font-black tabular-nums`}>{orderNumber(doc.number)}</p>
          </div>
          <div className="text-right text-[10pt] font-bold">
            <p>{ORDER_TYPE_LABEL[doc.orderType]}</p>
            {doc.orderType === "dine_in" && doc.tableNo && <p className={`${narrow ? "text-[13pt]" : "text-[16pt]"} leading-tight`}>Table {doc.tableNo}</p>}
          </div>
        </div>
        <p className="mt-[1.5mm] flex justify-between text-[10.5pt] font-bold tabular-nums">
          <span>{formatDate(at)}</span>
          <span>{formatTime(at)}</span>
        </p>
        {added.length > 0 && (
          <section className="mt-[2mm]">
            <p className="border-b-2 border-black text-[11pt] font-black">ADD</p>
            {rows(added, false)}
          </section>
        )}
        {removed.length > 0 && (
          <section className="mt-[3mm]">
            <p className="bg-black px-[1.5mm] text-[11pt] font-black text-white [print-color-adjust:exact]">CANCEL</p>
            {rows(removed, true)}
          </section>
        )}
      </div>
    </div>
  );
}
