import {
  Logo,
  COMPOSITION_DECLARATION,
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

/** A4 GST tax invoice laid out around the Rule 46 checklist. */
export function ClassicTemplate({ doc, qr }: TemplateProps) {
  const b = doc.business;
  const hasCustomer = doc.customerName || doc.customerPhone || doc.customerGstin || doc.customerAddress;
  return (
    <div className="bg-white p-[10mm] text-[10.5pt] leading-snug text-[#1a1a1a]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1a1a1a] pb-4">
        <div className="min-w-0">
          <Logo doc={doc} className="mb-[3mm] max-h-[22mm] w-auto max-w-[60mm]" />
          <h1 className="text-[18pt] leading-tight font-bold tracking-[-0.01em]">{b.cafeName}</h1>
          {b.legalName && b.legalName !== b.cafeName && <p className="font-medium">{b.legalName}</p>}
          {addressLines(doc).map((l) => (
            <p key={l} className="text-[#444]">
              {l}
            </p>
          ))}
          <p className="text-[#444]">{[b.phone && `Ph: ${b.phone}`, b.email].filter(Boolean).join("  ·  ")}</p>
          <div className="mt-1.5 grid gap-0.5 text-[9.5pt]">
            {b.gstin && (
              <p>
                <b>GSTIN:</b> {b.gstin}
              </p>
            )}
            {b.fssai && (
              <p>
                <b>FSSAI Lic. No.:</b> {b.fssai}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15pt] font-bold tracking-[0.08em] uppercase">{documentTitle(doc.taxMode)}</p>
          <p className="text-[8.5pt] text-[#666]">Original for recipient</p>
          <dl className="mt-3 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5 text-[9.5pt]">
            <dt className="text-[#666]">Invoice No.</dt>
            <dd className="font-semibold">{doc.number}</dd>
            <dt className="text-[#666]">Date</dt>
            <dd>
              {formatDate(doc.issuedAt)}, {formatTime(doc.issuedAt)}
            </dd>
            {placeOfSupply(doc) && (
              <>
                <dt className="text-[#666]">Place of supply</dt>
                <dd>{placeOfSupply(doc)}</dd>
              </>
            )}
            <dt className="text-[#666]">Order</dt>
            <dd>
              {ORDER_TYPE_LABEL[doc.orderType]}
              {doc.tableNo ? ` · Table ${doc.tableNo}` : ""}
            </dd>
            {doc.taxMode === "regular" && (
              <>
                <dt className="text-[#666]">Reverse charge</dt>
                <dd>No</dd>
              </>
            )}
          </dl>
        </div>
      </header>

      {hasCustomer && (
        <section className="mt-4 rounded-md border border-[#ddd] px-3 py-2">
          <p className="text-[8.5pt] font-semibold tracking-[0.06em] text-[#666] uppercase">Billed to</p>
          <p className="font-semibold">{doc.customerName || "Walk-in customer"}</p>
          {doc.customerAddress && <p className="text-[#444]">{doc.customerAddress}</p>}
          <p className="text-[#444]">{[doc.customerPhone && `Ph: ${doc.customerPhone}`, doc.customerGstin && `GSTIN: ${doc.customerGstin}`].filter(Boolean).join("  ·  ")}</p>
        </section>
      )}

      <table className="mt-4 w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="border-y border-[#1a1a1a] text-left">
            <th className="w-8 py-1.5 pr-2 font-semibold">#</th>
            <th className="py-1.5 pr-2 font-semibold">Description</th>
            <th className="py-1.5 pr-2 text-center font-semibold">SAC</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Qty</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Rate (₹)</th>
            <th className="py-1.5 text-right font-semibold">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i} className="border-b border-[#e5e5e5] align-top">
              <td className="py-1.5 pr-2 text-[#666]">{i + 1}</td>
              <td className="py-1.5 pr-2">
                <p className="font-medium">{l.name}</p>
                {lineDetail(l) && <p className="text-[8.5pt] text-[#666]">{lineDetail(l)}</p>}
                {l.note && <p className="text-[8.5pt] text-[#666] italic">Note: {l.note}</p>}
              </td>
              <td className="py-1.5 pr-2 text-center text-[#666]">{SAC_RESTAURANT}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{l.qty}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatAmount(l.unitPrice)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatAmount(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1 text-[9.5pt]">
          <p className="text-[8.5pt] font-semibold tracking-[0.06em] text-[#666] uppercase">Amount in words</p>
          <p className="font-medium">{amountInWords(doc.total)}</p>
          <p className="mt-2 text-[#444]">{doc.status === "due" ? "Payment due" : `Paid by: ${paymentLabel(doc)}`}</p>
          {doc.notes && <p className="mt-2 text-[#444]">{doc.notes}</p>}
          {qr && (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="UPI payment QR code" className="size-[26mm]" />
              <p className="text-[8.5pt] text-[#666]">
                Scan to pay with any UPI app
                <br />
                {b.upiId}
              </p>
            </div>
          )}
        </div>
        <table className="w-[72mm] shrink-0 text-[9.5pt]">
          <tbody>
            {totalRows(doc).map((r) => (
              <tr key={r.label}>
                <td className="py-0.5 text-[#444]">{r.label}</td>
                <td className="py-0.5 text-right tabular-nums">{signed(r)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-[#1a1a1a] text-[12pt] font-bold">
              <td className="pt-1.5">Total</td>
              <td className="pt-1.5 text-right tabular-nums">₹{formatAmount(doc.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="mt-8 flex items-end justify-between gap-6 border-t border-[#ddd] pt-3 text-[8.5pt] text-[#555]">
        <div className="max-w-[60%]">
          {doc.taxMode === "composition" && <p className="font-semibold text-[#1a1a1a]">{COMPOSITION_DECLARATION}</p>}
          {doc.taxMode === "regular" && <p>Prices include restaurant service under SAC {SAC_RESTAURANT}. No service charge has been levied.</p>}
          {b.footerNote && <p className="mt-1">{b.footerNote}</p>}
          <p className="mt-1">This is a computer-generated invoice.</p>
        </div>
        <div className="text-center">
          <div className="mb-1 h-10" />
          <p className="border-t border-[#999] pt-1">For {b.cafeName}</p>
          <p>Authorised signatory</p>
        </div>
      </footer>
    </div>
  );
}
