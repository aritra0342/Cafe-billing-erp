import { DietMark } from "@/components/ui";
import {
  COMPOSITION_DECLARATION,
  Logo,
  ORDER_TYPE_LABEL,
  paymentLabel,
  addressLines,
  amountInWords,
  documentTitle,
  formatAmount,
  formatDate,
  formatTime,
  lineDetail,
  signed,
  totalRows,
  type TemplateProps,
} from "./shared";

/** A5 café bill in the brand colour. */
export function ModernTemplate({ doc, qr }: TemplateProps) {
  const b = doc.business;
  const accent = b.accentColor || "#1b2459";
  return (
    <div className="bg-white text-[9.5pt] leading-snug text-[#1d1a17]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="px-[8mm] pt-[8mm] pb-[5mm] text-white" style={{ background: accent }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* On a white chip so a dark logo still shows on the brand colour. */}
            {b.logo && (
              <div className="mb-[3mm] inline-block rounded-[2mm] bg-white p-[1.5mm]">
                <Logo doc={doc} className="max-h-[16mm] w-auto max-w-[44mm]" />
              </div>
            )}
            <p className="text-[16pt] leading-tight font-semibold tracking-[-0.015em]">{b.cafeName}</p>
            {addressLines(doc).map((l) => (
              <p key={l} className="text-[8.5pt] opacity-85">
                {l}
              </p>
            ))}
          </div>
          <div className="shrink-0 text-right text-[8.5pt]">
            <p className="text-[9pt] font-semibold tracking-[0.1em] uppercase opacity-90">{documentTitle(doc.taxMode)}</p>
            <p className="mt-1 text-[11pt] font-semibold">{doc.number}</p>
            <p className="opacity-85">
              {formatDate(doc.issuedAt)} · {formatTime(doc.issuedAt)}
            </p>
          </div>
        </div>
      </header>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-b border-[#eee] px-[8mm] py-[3mm] text-[8pt] text-[#6b645c]">
        {b.gstin && <span>GSTIN {b.gstin}</span>}
        {b.fssai && <span>FSSAI {b.fssai}</span>}
        {b.phone && <span>{b.phone}</span>}
      </div>

      <div className="px-[8mm] py-[5mm]">
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-[8.5pt]">
          <div>
            <p className="text-[7.5pt] font-semibold tracking-[0.08em] text-[#8c847a] uppercase">Guest</p>
            <p className="font-medium">{doc.customerName || "Walk-in"}</p>
            {doc.customerPhone && <p className="text-[#6b645c]">{doc.customerPhone}</p>}
            {doc.customerGstin && <p className="text-[#6b645c]">GSTIN {doc.customerGstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-[7.5pt] font-semibold tracking-[0.08em] text-[#8c847a] uppercase">Order</p>
            <p className="font-medium">
              {ORDER_TYPE_LABEL[doc.orderType]}
              {doc.tableNo ? ` · Table ${doc.tableNo}` : ""}
            </p>
            <p className="text-[#6b645c]">{paymentLabel(doc)}</p>
          </div>
        </div>

        <ul className="divide-y divide-[#f0ece6]">
          {doc.lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 py-2">
              {l.diet && <DietMark diet={l.diet} className="mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {l.name} <span className="font-normal text-[#8c847a]">× {l.qty}</span>
                </p>
                {lineDetail(l) && <p className="text-[8pt] text-[#8c847a]">{lineDetail(l)}</p>}
              </div>
              <p className="tabular-nums">₹{formatAmount(l.amount)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-3 ml-auto w-[60%] text-[8.5pt]">
          {totalRows(doc).map((r) => (
            <div key={r.label} className="flex justify-between py-0.5 text-[#6b645c]">
              <span>{r.label}</span>
              <span className="tabular-nums">{signed(r)}</span>
            </div>
          ))}
          <div className="mt-1.5 flex items-baseline justify-between border-t pt-1.5" style={{ borderColor: accent }}>
            <span className="font-semibold">Total</span>
            <span className="text-[14pt] font-semibold tracking-[-0.01em] tabular-nums" style={{ color: accent }}>
              ₹{formatAmount(doc.total)}
            </span>
          </div>
          <p className="mt-1 text-right text-[7.5pt] text-[#8c847a]">{amountInWords(doc.total)}</p>
        </div>

        <footer className="mt-5 flex items-end justify-between gap-4 text-[8pt] text-[#6b645c]">
          <div className="max-w-[65%]">
            {doc.taxMode === "composition" && <p className="font-medium text-[#1d1a17]">{COMPOSITION_DECLARATION}</p>}
            {b.footerNote && <p>{b.footerNote}</p>}
            {doc.notes && <p className="mt-1">{doc.notes}</p>}
          </div>
          {qr && (
            <div className="grid justify-items-center gap-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="UPI payment QR code" className="size-[24mm]" />
              <span className="text-[7pt]">Pay via UPI</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
