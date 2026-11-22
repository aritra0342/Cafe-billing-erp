import {
  COMPOSITION_DECLARATION,
  ORDER_TYPE_LABEL,
  paymentLabel,
  addressLines,
  documentTitle,
  formatAmount,
  formatDate,
  formatTime,
  signed,
  totalRows,
  Logo,
  type TemplateProps,
} from "./shared";

const Rule = () => <div className="my-1.5 border-t border-dashed border-black" />;

/** POS receipt for 80mm / 58mm thermal rolls. */
export function ThermalTemplate({ doc, qr, narrow = false }: TemplateProps & { narrow?: boolean }) {
  const b = doc.business;
  const size = narrow ? "text-[8pt]" : "text-[9pt]";
  return (
    <div className={`bg-white ${narrow ? "px-[2mm]" : "px-[4mm]"} py-[4mm] leading-[1.35] text-black ${size}`} style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }}>
      <header className="text-center">
        {/* Thermal heads print in one colour, so preview the logo the way it will come out. */}
        <Logo doc={doc} className={`mx-auto mb-[2mm] w-auto grayscale ${narrow ? "max-h-[16mm] max-w-[40mm]" : "max-h-[20mm] max-w-[56mm]"}`} />
        <p className={`${narrow ? "text-[11pt]" : "text-[13pt]"} leading-tight font-bold`}>{b.cafeName}</p>
        {addressLines(doc).map((l) => (
          <p key={l}>{l}</p>
        ))}
        {b.phone && <p>Ph: {b.phone}</p>}
        {b.gstin && <p>GSTIN: {b.gstin}</p>}
        {b.fssai && <p>FSSAI: {b.fssai}</p>}
      </header>
      <Rule />
      <p className="text-center font-bold tracking-[0.12em] uppercase">{documentTitle(doc.taxMode)}</p>
      <Rule />
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <span>Bill</span>
        <span className="text-right font-bold">{doc.number}</span>
        <span>Date</span>
        <span className="text-right">
          {formatDate(doc.issuedAt)} {formatTime(doc.issuedAt)}
        </span>
        <span>Type</span>
        <span className="text-right">
          {ORDER_TYPE_LABEL[doc.orderType]}
          {doc.tableNo ? ` · T${doc.tableNo}` : ""}
        </span>
        {doc.customerName && (
          <>
            <span>Guest</span>
            <span className="truncate text-right">{doc.customerName}</span>
          </>
        )}
        {doc.customerGstin && (
          <>
            <span>GSTIN</span>
            <span className="text-right">{doc.customerGstin}</span>
          </>
        )}
      </div>
      <Rule />
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 font-bold">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="min-w-[14mm] text-right">Amt</span>
      </div>
      <Rule />
      {doc.lines.map((l, i) => (
        <div key={i} className="mb-1">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-2">
            <span className="break-words">
              {l.name}
              {l.variant ? ` (${l.variant})` : ""}
            </span>
            <span className="text-right tabular-nums">{l.qty}</span>
            <span className="min-w-[14mm] text-right tabular-nums">{formatAmount(l.amount)}</span>
          </div>
          {l.addons.map((a) => (
            <p key={a.name} className="pl-2">
              + {a.name}
            </p>
          ))}
          {l.qty > 1 && <p className="pl-2">@ {formatAmount(l.unitPrice)}</p>}
          {l.note && <p className="pl-2 italic">* {l.note}</p>}
        </div>
      ))}
      <Rule />
      {totalRows(doc).map((r) => (
        <div key={r.label} className="flex justify-between gap-2">
          <span>{r.label}</span>
          <span className="tabular-nums">{signed(r)}</span>
        </div>
      ))}
      <div className="my-1 border-t border-black" />
      <div className={`flex justify-between gap-2 font-bold ${narrow ? "text-[10pt]" : "text-[12pt]"}`}>
        <span>TOTAL</span>
        <span className="tabular-nums">₹{formatAmount(doc.total)}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>{doc.status === "due" ? "Payment" : "Paid by"}</span>
        <span className={doc.status === "due" ? "font-bold" : ""}>{doc.status === "due" ? "DUE" : paymentLabel(doc)}</span>
      </div>
      <Rule />
      {qr && (
        <div className="grid justify-items-center gap-1 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="UPI payment QR code" className={narrow ? "size-[30mm]" : "size-[36mm]"} />
          <p>Scan &amp; pay via UPI</p>
        </div>
      )}
      {doc.taxMode === "composition" && <p className="text-center">{COMPOSITION_DECLARATION}</p>}
      {b.footerNote && <p className="mt-1 text-center">{b.footerNote}</p>}
      <p className="mt-1 text-center">*** Thank you ***</p>
    </div>
  );
}
