import { Suspense } from "react";
import { getSettings, getTodayStats } from "@/lib/data";
import { formatINR, formatTime, IST, paidByLabel, PAYMENT_LABEL } from "@/lib/billing";
import { getExpenses } from "@/lib/reports";
import Link from "@/components/link";
import { ButtonLink, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { Ledger, LedgerTotal } from "@/components/ledger";
import { IconPlus } from "@/components/icons";

export const metadata = { title: "Today" };

const SHOWN = 15;

export default function Page() {
  return (
    <>
      <Suspense fallback={<PageHeader title="Today" />}>
        <Header />
      </Suspense>
      <Suspense fallback={<Skeleton className="mb-8 h-20 w-full" />}>
        <SetupPrompt />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="h-96" />
            <Skeleton className="h-72" />
          </div>
        }
      >
        <Day />
      </Suspense>
    </>
  );
}

async function Header() {
  const { bills, collected, due } = await getTodayStats();
  const date = new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return (
    <PageHeader
      title={date}
      description={
        bills.length ? (
          <>
            <span className="font-[600] text-good">{formatINR(collected)} collected</span> from {bills.length - due.count} paid bill{bills.length - due.count === 1 ? "" : "s"}
            {due.count > 0 ? (
              <>
                , <span className="font-[600] text-bad">{formatINR(due.amount)} still due</span> on {due.count} bill{due.count === 1 ? "" : "s"}
              </>
            ) : null}
            .
          </>
        ) : (
          "No bills yet today."
        )
      }
      actions={
        <ButtonLink href="/invoices/new" variant="primary" size="lg">
          <IconPlus className="size-5" /> New bill
        </ButtonLink>
      }
    />
  );
}

async function SetupPrompt() {
  const settings = await getSettings();
  if (settings) return null;
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-accent-soft px-5 py-4">
      <div>
        <p className="font-[600]">Add your café details before the first bill</p>
        <p className="text-ink-2">Your name, GSTIN and FSSAI number print at the top of every invoice.</p>
      </div>
      <ButtonLink href="/settings?welcome=1" variant="primary">
        Add café details
      </ButtonLink>
    </div>
  );
}

async function Day() {
  const [{ bills, revenue, collected, due, average, byPayment, topItems }, expenses] = await Promise.all([getTodayStats(), getExpenses()]);
  const spent = Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;

  if (bills.length === 0) {
    return (
      <EmptyState title="The day's ledger is empty" action={<ButtonLink href="/invoices/new" variant="primary">Start the first bill</ButtonLink>}>
        Every bill you save at the counter lands here, with the day&apos;s takings split by cash, UPI and card so you can tally the drawer at closing.
      </EmptyState>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="ledger-h">
        <h2 id="ledger-h" className="title mb-3">
          Today&apos;s bills
        </h2>
        <Ledger
          rows={bills.slice(0, SHOWN).map((b) => ({
            id: b.id,
            number: b.number,
            when: formatTime(b.issuedAt),
            guest: b.customerName || (b.tableNo ? `Table ${b.tableNo}` : "Walk-in"),
            paidBy: paidByLabel(b, false),
            status: b.status,
            total: b.total,
          }))}
          footer={
            <>
              {bills.length > SHOWN && <p className="px-5 pt-3 text-[0.875rem] text-ink-2">Showing the latest {SHOWN} of {bills.length} bills.</p>}
              <LedgerTotal label={`Billed on ${bills.length} bill${bills.length === 1 ? "" : "s"}`} amount={revenue} />
            </>
          }
        />
      </section>

      <aside className="grid gap-8">
        <section aria-labelledby="drawer-h">
          <h2 id="drawer-h" className="title mb-3">
            Takings by payment
          </h2>
          <dl className="grid gap-2">
            {byPayment.length === 0 && <div className="text-ink-2">Nothing paid yet today.</div>}
            {byPayment.map(([mode, v]) => (
              <div key={mode} className="flex items-baseline gap-2">
                <dt className="font-[560]">{PAYMENT_LABEL[mode]}</dt>
                <dd className="text-[0.875rem] text-ink-3">
                  {v.count} bill{v.count === 1 ? "" : "s"}
                </dd>
                <span className="leader" aria-hidden />
                <dd className="money text-[1.125rem]">{formatINR(v.amount)}</dd>
              </div>
            ))}
            <div className="mt-1 flex items-baseline gap-2 border-t border-line pt-2 font-[600] text-good">
              <dt>Collected</dt>
              <span className="leader" aria-hidden />
              <dd className="money text-[1.125rem]">{formatINR(collected)}</dd>
            </div>
            {due.count > 0 && (
              <div className="flex items-baseline gap-2 font-[600] text-bad">
                <dt>Still due</dt>
                <dd className="text-[0.875rem] font-normal">
                  {due.count} bill{due.count === 1 ? "" : "s"}
                </dd>
                <span className="leader" aria-hidden />
                <dd className="money text-[1.125rem]">{formatINR(due.amount)}</dd>
              </div>
            )}
            <div className="mt-1 flex items-baseline gap-2 border-t border-line pt-2">
              <dt className="font-[560]">
                <Link href="/expenses" className="underline decoration-line underline-offset-4 hover:decoration-ink">
                  Expenses
                </Link>
              </dt>
              <dd className="text-[0.875rem] text-ink-3">{expenses.length ? `${expenses.length} written` : "none yet"}</dd>
              <span className="leader" aria-hidden />
              <dd className="money text-[1.125rem]">{formatINR(spent)}</dd>
            </div>
            <div className="flex items-baseline gap-2 font-[600]">
              <dt>Left after expenses</dt>
              <span className="leader" aria-hidden />
              <dd className="money text-[1.125rem]">{formatINR(Math.round((collected - spent) * 100) / 100)}</dd>
            </div>
            <div className="mt-1 flex items-baseline gap-2 border-t border-line pt-2 text-ink-2">
              <dt>Average bill</dt>
              <span className="leader" aria-hidden />
              <dd className="num">{formatINR(average)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="top-h">
          <h2 id="top-h" className="title mb-3">
            Selling most today
          </h2>
          <ol className="grid gap-2">
            {topItems.map(([name, qty]) => (
              <li key={name} className="flex items-baseline gap-2">
                <span className="truncate">{name}</span>
                <span className="leader" aria-hidden />
                <span className="num font-[600]">{qty}</span>
              </li>
            ))}
          </ol>
          <Link href="/reports/items?period=day" className="mt-3 inline-block font-[560] text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
            Every item sold, by date
          </Link>
        </section>
      </aside>
    </div>
  );
}
