/*
 * Layout adapted from "GST Invoice Template" (v5) by Nitin, published under the MIT License
 * https://huggingface.co/spaces/Nra/sbn_invoice/blob/main/Invoice_visualpath.html
 * Full notice in THIRD_PARTY_NOTICES.md.
 *
 * Kept from the original: the fully ruled box, centred letterhead with the title on a
 * grey band, the two-column seller/buyer grid, the bordered particulars table with
 * Sub total/CGST/SGST/Total in its footer, "E. & O.E", the boxed amount in words, the
 * HSN/SAC tax summary table, the declaration panel and the two-sided signature block.
 * Changed: it renders a café bill (SAC 9963, every line listed, no IGST since a
 * restaurant supply is always intra-state) and drops the static company data and inputs.
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

const cell = "border border-black px-[6px] py-[4px]";
const th = `${cell} bg-[#f2f2f2] font-bold`;
const foot = `${cell} bg-[#e9e9e9] text-right font-bold`;

export function GstBoxedTemplate({ doc, qr }: TemplateProps) {
  const b = doc.business;
  const regular = doc.taxMode === "regular";
  const half = doc.gstRate / 2;
  const tax = doc.cgst + doc.sgst;
  return (
    <div className="bg-white p-[8mm] text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9.5pt", lineHeight: 1.4 }}>
      <div className="border-2 border-black p-[12px]">
        <header className="text-center">
          <Logo doc={doc} className="mx-auto mb-[6px] max-h-[22mm] w-auto max-w-[70mm]" />
          <h2 className="text-[16pt] font-bold text-[#1e3f66]">{b.legalName || b.cafeName}</h2>
          {b.legalName && b.legalName !== b.cafeName && <p className="font-bold">Trading as {b.cafeName}</p>}
          <p>{addressLines(doc).join(", ")}</p>
          <p className="font-bold">{[b.phone && `Phone: ${b.phone}`, b.email && `Email: ${b.email}`].filter(Boolean).join(" | ")}</p>
          <hr className="my-[8px] border-black" />
          <h3 className="bg-[#e6e6e6] py-[5px] text-[13pt] font-bold tracking-[0.04em] uppercase">{documentTitle(doc.taxMode)}</h3>
          <p className="mt-[2px] text-[8.5pt]">{regular ? "Under section 31 of the CGST Act read with Rule 46" : "Under section 31(3)(c) of the CGST Act read with Rule 49"}</p>
        </header>

        <div className="mt-[10px] grid grid-cols-2 border border-black">
          <div className="border-r border-black p-[8px]">
            <h4 className="mb-[4px] font-bold">{b.cafeName}</h4>
            {addressLines(doc).map((l) => (
              <p key={l}>{l}</p>
            ))}
            {b.gstin && (
              <p className="mt-[6px]">
                <b>GSTIN:</b> {b.gstin}
              </p>
            )}
            {b.fssai && (
              <p>
                <b>FSSAI Lic. No.:</b> {b.fssai}
              </p>
            )}
            <p className="mt-[6px]">
              <b>Mode of payment:</b> {paymentLabel(doc)}
            </p>
            {b.phone && (
              <p>
                <b>Contact:</b> {b.phone}
              </p>
            )}
          </div>
          <div className="p-[8px]">
            <p>
              <b>Invoice No.:</b> {doc.number}
            </p>
            <p>
              <b>Dated:</b> {formatDate(doc.issuedAt)}, {formatTime(doc.issuedAt)}
            </p>
            <p className="mb-[6px]">
              <b>Order:</b> {ORDER_TYPE_LABEL[doc.orderType]}
              {doc.tableNo ? `, table ${doc.tableNo}` : ""}
            </p>
            <h4 className="mb-[4px] font-bold">Buyer: {doc.customerName || "Walk-in customer"}</h4>
            {doc.customerAddress && <p>{doc.customerAddress}</p>}
            {doc.customerGstin && (
              <p>
                <b>GSTIN:</b> {doc.customerGstin}
              </p>
            )}
            {doc.customerPhone && (
              <p>
                <b>Phone:</b> {doc.customerPhone}
              </p>
            )}
            {placeOfSupply(doc) && (
              <p className="mt-[6px]">
                <b>Place of supply:</b> {placeOfSupply(doc)}
              </p>
            )}
            {regular && (
              <p>
                <b>Reverse charge:</b> No
              </p>
            )}
          </div>
        </div>

        <table className="mt-[10px] w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-[7%] text-center`}>Sl No.</th>
              <th className={`${th} text-left`}>Particulars</th>
              <th className={`${th} w-[11%] text-center`}>HSN/SAC</th>
              <th className={`${th} w-[7%] text-center`}>Qty</th>
              <th className={`${th} w-[13%] text-right`}>Rate</th>
              <th className={`${th} w-[15%] text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i} className="align-top">
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td className={cell}>
                  {l.name}
                  {lineDetail(l) && <span className="block text-[8pt]">{lineDetail(l)}</span>}
                  {l.note && <span className="block text-[8pt] italic">Note: {l.note}</span>}
                </td>
                <td className={`${cell} text-center`}>{SAC_RESTAURANT}</td>
                <td className={`${cell} text-center tabular-nums`}>{l.qty}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatAmount(l.unitPrice)}</td>
                <td className={`${cell} text-right tabular-nums`}>{formatAmount(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Shared rows include "Taxable value", so tax-inclusive menus still add up on paper. */}
            {totalRows(doc).map((r) => (
              <FootRow key={r.label} label={r.negative ? `Less: ${r.label.toLowerCase()}` : r.label} value={signed(r)} />
            ))}
            <FootRow label="Total" value={`₹ ${formatAmount(doc.total)}`} />
            <tr>
              <td colSpan={6} className={`${cell} text-right italic`}>
                E. &amp; O.E
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-[10px] border border-dashed border-black bg-[#eef] p-[6px]">
          <p>
            <b>Amount chargeable (in words):</b> {amountInWords(doc.total)}
          </p>
        </div>

        {regular && (
          <>
            <table className="mt-[10px] w-full border-collapse">
              <thead>
                <tr>
                  <th rowSpan={2} className={`${th} text-center`}>
                    HSN/SAC
                  </th>
                  <th rowSpan={2} className={`${th} text-right`}>
                    Taxable value
                  </th>
                  <th colSpan={2} className={`${th} text-center`}>
                    Central tax
                  </th>
                  <th colSpan={2} className={`${th} text-center`}>
                    State tax
                  </th>
                  <th rowSpan={2} className={`${th} text-right`}>
                    Total tax
                  </th>
                </tr>
                <tr>
                  <th className={`${th} text-center`}>Rate</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={`${th} text-center`}>Rate</th>
                  <th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${cell} text-center`}>{SAC_RESTAURANT}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatAmount(doc.taxable)}</td>
                  <td className={`${cell} text-center`}>{half}%</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatAmount(doc.cgst)}</td>
                  <td className={`${cell} text-center`}>{half}%</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatAmount(doc.sgst)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{formatAmount(tax)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-[10px] border border-dashed border-black bg-[#eef] p-[6px]">
              <p>
                <b>Tax amount (in words):</b> {amountInWords(tax)}
              </p>
            </div>
          </>
        )}

        <div className="mt-[10px] grid grid-cols-2 border border-black">
          <div className="border-r border-black p-[8px]">
            <p className="font-bold">Payment details</p>
            <hr className="my-[4px] border-black" />
            <p>
              {doc.status === "due" ? <b>Payment due</b> : <><b>Paid by:</b> {paymentLabel(doc)}</>}
            </p>
            {b.upiId && (
              <p>
                <b>UPI ID:</b> {b.upiId}
              </p>
            )}
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="UPI payment QR code" className="mt-[6px] size-[22mm]" />
            )}
          </div>
          <div className="p-[8px]">
            <p className="font-bold">Declaration</p>
            <hr className="my-[4px] border-black" />
            {regular ? <p>We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.</p> : <p className="font-bold">{COMPOSITION_DECLARATION}</p>}
            {doc.notes && <p className="mt-[4px]">{doc.notes}</p>}
            {b.footerNote && <p className="mt-[4px]">{b.footerNote}</p>}
          </div>
        </div>

        <div className="mt-[16px] flex items-end justify-between">
          <p className="w-[45%] border-t border-black pt-[4px]">Customer&apos;s signature</p>
          <div className="w-[45%] text-right">
            <p>For {b.legalName || b.cafeName}</p>
            <p className="mt-[32px] font-bold">Authorised signatory</p>
          </div>
        </div>
        <p className="mt-[10px] text-center text-[8pt] text-[#888] italic">This is a computer-generated invoice and needs no signature.</p>
      </div>
    </div>
  );
}

function FootRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td colSpan={5} className={foot}>
        {label}
      </td>
      <td className={`${foot} tabular-nums`}>{value}</td>
    </tr>
  );
}
