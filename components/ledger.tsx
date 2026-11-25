import Link from "@/components/link";
import type { ReactNode } from "react";
import { formatINR, type PaymentStatus } from "@/lib/billing";

/** `paidBy` is how the bill was paid, in words: "UPI", or "Cash + UPI" for a mixed payment. */
export type LedgerRow = { id: string; number: string; when: string; guest: string; paidBy: string; status: PaymentStatus; total: number };

const cols = "grid grid-cols-[1fr_auto] items-baseline gap-x-4 sm:grid-cols-[6.5rem_9.5rem_minmax(0,1fr)_minmax(6rem,auto)_7rem]";

/** Paid bills sit on a green line, due bills on a red one, so what's still owed stands out at a glance. */
const tone: Record<PaymentStatus, string> = {
  paid: "border-l-good bg-good/[0.07] hover:bg-good/[0.14]",
  due: "border-l-bad bg-bad/[0.08] hover:bg-bad/[0.15]",
};

function StatusPill({ status, paidBy }: { status: PaymentStatus; paidBy: string }) {
  return status === "due" ? (
    <span className="inline-flex items-center rounded-full bg-bad px-2 py-0.5 text-[0.8125rem] leading-tight font-[650] text-bg">Due</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-good px-2 py-0.5 text-[0.8125rem] leading-tight font-[650] text-bg">Paid, {paidBy}</span>
  );
}

/** Bills set out like a ruled ledger page: one line per bill, amounts in a right-hand money column. */
export function Ledger({ rows, footer, whenLabel = "Time" }: { rows: LedgerRow[]; footer?: ReactNode; whenLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className={`${cols} label hidden border-b-2 border-rule px-5 pt-4 pb-2 sm:grid`} aria-hidden>
        <span>{whenLabel}</span>
        <span>Bill no.</span>
        <span>Guest</span>
        <span>Payment</span>
        <span className="text-right">Amount</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="border-b border-line last:border-b-0">
            <Link
              href={`/invoices/${r.id}`}
              aria-label={`Bill ${r.number}, ${r.guest}, ${formatINR(r.total)}, ${r.status === "due" ? "due" : `paid by ${r.paidBy}`}`}
              className={`${cols} border-l-4 py-3 pr-5 pl-4 transition-colors ${tone[r.status]}`}
            >
              <span className="num hidden text-ink-2 sm:block">{r.when}</span>
              <span className="min-w-0">
                <span className="num block truncate font-[600]">{r.number}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.875rem] text-ink-2 sm:hidden">
                  <span>{r.when}</span>
                  <span className="truncate">{r.guest}</span>
                  <StatusPill status={r.status} paidBy={r.paidBy} />
                </span>
              </span>
              <span className="hidden truncate sm:block">{r.guest}</span>
              <span className="hidden sm:block">
                <StatusPill status={r.status} paidBy={r.paidBy} />
              </span>
              <span className={`money text-right text-[1.125rem] ${r.status === "due" ? "text-bad" : ""}`}>{formatINR(r.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}

/** The double-ruled total line at the foot of a ledger page. */
export function LedgerTotal({ label, amount }: { label: ReactNode; amount: number }) {
  return (
    <div className="px-5 pt-1 pb-5">
      <div className="double-rule flex items-baseline justify-between gap-4">
        <span className="font-[600]">{label}</span>
        <span className="money text-[1.5rem]">{formatINR(amount)}</span>
      </div>
    </div>
  );
}
