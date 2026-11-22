import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getInvoice, getInvoiceHistory, getLogo, type BillEvent } from "@/lib/data";
import { upiQr } from "@/lib/qr";
import { getTemplate } from "@/lib/templates";
import { formatINR, formatDate, formatDateTime, PAYMENT_LABEL, type LineChange, type PaymentMode } from "@/lib/billing";
import { InvoicePaper } from "@/components/invoice-templates";
import { ChangeSlip, KitchenSlip } from "@/components/kitchen-slip";
import { AutoPrintSlip, InvoiceActions, PaymentBar } from "@/components/invoice-actions";
import { lineDetail } from "@/components/invoice-templates/shared";
import { Skeleton } from "@/components/ui";

export const metadata = { title: "Bill" };

export default function Page({ params, searchParams }: PageProps<"/invoices/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6">
          <Skeleton className="h-11 w-full max-w-xl" />
          <Skeleton className="mx-auto h-[70vh] w-full max-w-[186mm]" />
        </div>
      }
    >
      <InvoiceView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function InvoiceView({ params, searchParams }: Pick<PageProps<"/invoices/[id]">, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const saved = await getInvoice(id);
  if (!saved) notFound();
  // The logo isn't stored on each bill (it would add up to 200 KB per row), so bills print the current one.
  const doc = { ...saved, business: { ...saved.business, logo: await getLogo() } };
  const template = getTemplate(doc.templateId);
  // Kitchen slips print on the 80 mm roll, or 58 mm when the bill itself is on the narrow roll.
  const slipPaper = template.paper === "58mm" ? "58mm" : "80mm";
  const [qr, history] = await Promise.all([upiQr(doc), getInvoiceHistory(doc.id)]);
  const isNew = sp.new === "1";
  const lastEdit = history.findLast((e): e is Extract<BillEvent, { type: "items" }> => e.type === "items" && (e.change.added.length > 0 || e.change.removed.length > 0));
  const autoSlip = sp.kot === "1" ? "full" : sp.kot === "changes" && lastEdit ? "changes" : null;
  const due = doc.status === "due";

  const shareText = [
    `${doc.business.cafeName}, bill ${doc.number}`,
    formatDate(doc.issuedAt),
    "",
    ...doc.lines.map((l) => `${l.qty} x ${l.name}${l.variant ? ` (${l.variant})` : ""}: ${formatINR(l.amount)}`),
    "",
    `Total ${formatINR(doc.total)}`,
    due && doc.business.upiId ? `Pay by UPI to ${doc.business.upiId}` : due ? "" : `Paid by ${PAYMENT_LABEL[doc.paymentMode]}`,
    doc.business.footerNote,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  return (
    <>
      <style id="page-size">{template.pageCss}</style>
      <InvoiceActions id={doc.id} templateId={template.id} paper={template.paper} slipPaper={slipPaper} isNew={isNew} shareText={shareText} phone={doc.customerPhone} hasChanges={Boolean(lastEdit)} />
      <PaymentBar id={doc.id} status={doc.status} paymentMode={doc.paymentMode} paidAt={doc.paidAt} total={doc.total} />
      <div className="overflow-x-auto pt-2 pb-6 print:overflow-visible print:p-0">
        <div className="relative mx-auto w-fit">
          <InvoicePaper templateId={template.id} doc={doc} qr={qr} />
          {isNew && (
            <div
              role="status"
              aria-label={due ? "Bill saved, payment due" : `Bill saved and marked paid by ${PAYMENT_LABEL[doc.paymentMode]}`}
              className="no-print pointer-events-none absolute top-[14%] right-[-1.5rem] sm:right-[-3rem]"
            >
              <div className={`stamp stamp-in ${due ? "stamp-due" : ""}`}>
                <span className="text-[2rem] font-[800] tracking-[0.08em]">{due ? "DUE" : "PAID"}</span>
                <span className="text-[0.8125rem] font-[700] tracking-[0.06em]">{due ? formatINR(doc.total) : `BY ${PAYMENT_LABEL[doc.paymentMode].toUpperCase()}`}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <BillHistory events={history} issuedAt={doc.issuedAt} width={template.width} />
      <KitchenSlip doc={doc} paper={slipPaper} />
      {lastEdit && <ChangeSlip doc={doc} paper={slipPaper} added={lastEdit.change.added} removed={lastEdit.change.removed} at={lastEdit.at} />}
      {autoSlip && <AutoPrintSlip paper={slipPaper} kind={autoSlip} />}
    </>
  );
}

const statusText = (s: string) => (s.startsWith("paid:") ? `paid by ${PAYMENT_LABEL[s.slice(5) as PaymentMode] ?? "other"}` : "due");
const changeText = (l: LineChange) => `${l.qty} × ${l.name}${lineDetail(l) ? ` (${lineDetail(l)})` : ""}`;

/** The bill's own record of what happened to it after it was issued. Shown on screen only; it never prints. */
function BillHistory({ events, issuedAt, width }: { events: BillEvent[]; issuedAt: string; width: string }) {
  if (events.length === 0) return null;
  const name = (id: string) => getTemplate(id).name;
  return (
    <section aria-labelledby="bill-history" className="no-print mx-auto border-t border-line pt-4" style={{ maxWidth: width }}>
      <h2 id="bill-history" className="label">
        Bill history
      </h2>
      <ol className="mt-2 grid gap-2 text-ink-2">
        <li>
          Issued on <span className="num">{formatDateTime(issuedAt)}</span>.
        </li>
        {events.map((e) => (
          <li key={e.id}>
            <span className="num">{formatDateTime(e.at)}</span>:{" "}
            {e.type === "layout" ? (
              <>
                layout changed from {name(e.from)} to <span className="font-[560] text-ink">{name(e.to)}</span>.
              </>
            ) : e.type === "status" ? (
              <>
                marked <span className={`font-[560] ${e.to === "due" ? "text-bad" : "text-good"}`}>{statusText(e.to)}</span>.
              </>
            ) : (
              <>
                items changed, total {formatINR(e.change.fromTotal)} to <span className="money text-ink">{formatINR(e.change.toTotal)}</span>.
                {e.change.added.length > 0 && <span className="block pl-4">Added {e.change.added.map(changeText).join(", ")}.</span>}
                {e.change.removed.length > 0 && <span className="block pl-4">Removed {e.change.removed.map(changeText).join(", ")}.</span>}
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
