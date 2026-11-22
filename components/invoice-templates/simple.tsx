/*
 * Layout ported from sparksuite/simple-html-invoice-template
 * https://github.com/sparksuite/simple-html-invoice-template
 * MIT License, Copyright (c) 2021 Sparksuite. Full notice in THIRD_PARTY_NOTICES.md.
 *
 * Kept from the original: the single bordered box, the large name top-left with the
 * invoice facts top-right, the from/to information row, grey heading bars over each
 * block, hairline item rows and the bold total over a 2px rule. Changed: the data is
 * an Indian GST bill, so it gains GSTIN/FSSAI, SAC, CGST/SGST rows and amount in words.
 */
import {
  COMPOSITION_DECLARATION,
  Logo,
  ORDER_TYPE_LABEL,
  paymentLabel,
  SAC_RESTAURANT,
  addressLines,
  amountInWords,
  documentTitle,
  formatAmount,
  formatDate,
  formatTime,
  lineDetail,
  placeOfSupply,
  signed,
  totalRows,
  type TemplateProps,
} from "./shared";

const box = "border-b border-[#eee] py-[5px]";
const heading = "bg-[#eee] border-b border-[#ddd] py-[5px] font-bold";

export function SimpleTemplate({ doc, qr }: TemplateProps) {
  const b = doc.business;
  const guest = [doc.customerName || "Walk-in customer", doc.customerAddress, doc.customerPhone && `Ph: ${doc.customerPhone}`, doc.customerGstin && `GSTIN: ${doc.customerGstin}`].filter(Boolean);
  return (
    <div className="bg-white p-[8mm] text-[#555]" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: "11pt", lineHeight: 1.5 }}>
      <div className="border border-[#eee] p-[22px]">
        <table className="w-full border-collapse text-left">
          <tbody>
            <tr>
              <td className="pb-[18px] align-top">
                {/* The original template puts the logo here, in the title cell. */}
                <Logo doc={doc} className="mb-[8px] max-h-[28mm] w-auto max-w-[70mm]" />
                <p className="text-[26pt] leading-[1.1] text-[#333]">{b.cafeName}</p>
                {b.legalName && b.legalName !== b.cafeName && <p>{b.legalName}</p>}
              </td>
              <td className="pb-[18px] text-right align-top">
                <p className="font-bold text-[#333]">{documentTitle(doc.taxMode)}</p>
                <p>Invoice #: {doc.number}</p>
                <p>
                  Issued: {formatDate(doc.issuedAt)}, {formatTime(doc.issuedAt)}
                </p>
                {placeOfSupply(doc) && <p>Place of supply: {placeOfSupply(doc)}</p>}
              </td>
            </tr>
            <tr>
              <td className="pb-[28px] align-top">
                {addressLines(doc).map((l) => (
                  <p key={l}>{l}</p>
                ))}
                {b.phone && <p>Ph: {b.phone}</p>}
                {b.gstin && <p>GSTIN: {b.gstin}</p>}
                {b.fssai && <p>FSSAI: {b.fssai}</p>}
              </td>
              <td className="pb-[28px] text-right align-top">
                {guest.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                <p>
                  {ORDER_TYPE_LABEL[doc.orderType]}
                  {doc.tableNo ? `, table ${doc.tableNo}` : ""}
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse text-left">
          <tbody>
            <tr>
              <td className={heading}>Payment method</td>
              <td className={`${heading} text-right`}>{doc.status === "due" ? "Due" : "Paid"}</td>
            </tr>
            <tr>
              <td className="pt-[5px] pb-[20px]">{paymentLabel(doc)}</td>
              <td className="pt-[5px] pb-[20px] text-right tabular-nums">₹{formatAmount(doc.total)}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse text-left">
          <tbody>
            <tr>
              <td className={heading}>Item</td>
              <td className={`${heading} w-[14%] text-center`}>SAC</td>
              <td className={`${heading} w-[10%] text-right`}>Qty</td>
              <td className={`${heading} w-[20%] text-right`}>Price</td>
            </tr>
            {doc.lines.map((l, i) => (
              <tr key={i} className="align-top">
                <td className={box}>
                  {l.name}
                  {lineDetail(l) && <span className="block text-[9pt] text-[#888]">{lineDetail(l)}</span>}
                  {l.note && <span className="block text-[9pt] text-[#888] italic">Note: {l.note}</span>}
                </td>
                <td className={`${box} text-center text-[#888]`}>{SAC_RESTAURANT}</td>
                <td className={`${box} text-right tabular-nums`}>{l.qty}</td>
                <td className={`${box} text-right tabular-nums`}>₹{formatAmount(l.amount)}</td>
              </tr>
            ))}
            {totalRows(doc).map((r) => (
              <tr key={r.label}>
                <td colSpan={3} className="pt-[5px] text-right">
                  {r.label}
                </td>
                <td className="pt-[5px] text-right tabular-nums">{signed(r)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} />
              <td className="border-t-2 border-[#eee] pt-[5px] text-right font-bold text-[#333] tabular-nums">Total: ₹{formatAmount(doc.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-[24px] flex items-end justify-between gap-6 text-[9.5pt]">
          <div className="min-w-0">
            <p>
              <b className="text-[#333]">In words:</b> {amountInWords(doc.total)}
            </p>
            {doc.taxMode === "composition" && <p className="mt-1 font-bold text-[#333]">{COMPOSITION_DECLARATION}</p>}
            {doc.notes && <p className="mt-1">{doc.notes}</p>}
            {b.footerNote && <p className="mt-1">{b.footerNote}</p>}
            <p className="mt-1 text-[#999]">This is a computer-generated invoice.</p>
          </div>
          {qr && (
            <div className="shrink-0 text-center text-[8.5pt]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="UPI payment QR code" className="mx-auto size-[24mm]" />
              <p>Pay by UPI: {b.upiId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
