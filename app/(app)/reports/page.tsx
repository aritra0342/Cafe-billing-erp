import { Suspense } from "react";
import { formatINR, istDateKey, PAYMENT_LABEL, TENDERS } from "@/lib/billing";
import { addTotals, collected, daySummaries, type DayTotals } from "@/lib/reports";
import { daysBetween, formatDayShort, formatMonth, resolveRange } from "@/lib/periods";
import Link from "@/components/link";
import { PeriodBar, ReportTabs } from "@/components/period-bar";
import { RecountButton } from "@/components/expense-sheet";
import { PageHeader, Sheet, Skeleton } from "@/components/ui";

export const metadata = { title: "Collection" };

export default function Page({ searchParams }: PageProps<"/reports">) {
  return (
    <>
      <PageHeader title="Reports" description="How much came in by cash, UPI and card, week by week, month by month and across the year." />
      <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
        <Collection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const Amount = ({ value, className = "" }: { value: number; className?: string }) =>
  value ? <span className={`num ${className}`}>{formatINR(value)}</span> : <span className="text-ink-3">0</span>;

async function Collection({ searchParams }: Pick<PageProps<"/reports">, "searchParams">) {
  const sp = await searchParams;
  const today = istDateKey();
  const range = resolveRange(sp, today, "week");
  const days = await daySummaries(range.from, range.to);
  const sum = addTotals(days);
  const got = collected(sum);
  const left = Math.round((got - sum.expenses) * 100) / 100;
  const query = range.kind === "custom" ? `?from=${range.from}&to=${range.to}` : `?period=${range.kind}${range.at === today ? "" : `&at=${range.at}`}`;

  // A year (or a long stretch of hand-picked dates) reads better month by month.
  const byMonth = range.kind === "year" || daysBetween(range.from, range.to).length > 62;
  const rows: { key: string; label: string; href: string; totals: DayTotals }[] = byMonth
    ? [...Map.groupBy(days, (d) => d.day.slice(0, 7))].map(([month, ds]) => ({
        key: month,
        label: formatMonth(`${month}-01`),
        href: `/reports?period=month&at=${ds[ds.length - 1].day}`,
        totals: addTotals(ds),
      }))
    : days.map((d) => ({ key: d.day, label: d.day === today ? `Today, ${formatDayShort(d.day)}` : formatDayShort(d.day), href: `/expenses?day=${d.day}`, totals: d }));
  rows.reverse();

  return (
    <div className="grid gap-7">
      <div>
        <ReportTabs current="collection" query={query} />
        <PeriodBar path="/reports" range={range} kinds={["week", "month", "year"]} today={today} />
      </div>

      <section aria-label={`Collection, ${range.label}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
        {TENDERS.filter((t) => t !== "other" || sum.other > 0).map((t) => (
          <Sheet key={t} className="px-5 py-4">
            <p className="label">{PAYMENT_LABEL[t]}</p>
            <p className="money mt-1 text-[2rem] leading-none">{formatINR(sum[t])}</p>
            <p className="mt-2 text-[0.875rem] text-ink-3">{got > 0 ? `${Math.round((sum[t] / got) * 100)}% of what came in` : "Nothing yet"}</p>
          </Sheet>
        ))}
        <Sheet className="border-good/40 bg-good/10 px-5 py-4">
          <p className="label text-good">Total collected</p>
          <p className="money mt-1 text-[2rem] leading-none text-good">{formatINR(got)}</p>
          <p className="mt-2 text-[0.875rem] text-ink-2">
            {sum.paidBills} paid bill{sum.paidBills === 1 ? "" : "s"}
          </p>
        </Sheet>
      </section>

      <dl className="grid max-w-xl gap-2">
        <div className="flex items-baseline gap-2">
          <dt className="font-[560]">Spent on expenses</dt>
          <span className="leader" aria-hidden />
          <dd className="money text-[1.125rem]">{formatINR(sum.expenses)}</dd>
        </div>
        <div className="flex items-baseline gap-2 font-[650]">
          <dt>Left after expenses</dt>
          <span className="leader" aria-hidden />
          <dd className={`money text-[1.25rem] ${left < 0 ? "text-bad" : ""}`}>{formatINR(left)}</dd>
        </div>
        {sum.dueBills > 0 && (
          <div className="flex items-baseline gap-2 text-bad">
            <dt className="font-[560]">Still due</dt>
            <dd className="text-[0.875rem]">
              {sum.dueBills} bill{sum.dueBills === 1 ? "" : "s"}, not counted above
            </dd>
            <span className="leader" aria-hidden />
            <dd className="money text-[1.125rem]">{formatINR(sum.due)}</dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="by-h">
        <h2 id="by-h" className="title mb-3">
          {byMonth ? "Month by month" : "Day by day"}
        </h2>
        <Sheet className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-right">
            <thead>
              <tr className="border-b border-line text-[0.875rem] text-ink-2 [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-[560]">
                <th scope="col" className="text-left">
                  {byMonth ? "Month" : "Day"}
                </th>
                <th scope="col">Bills</th>
                <th scope="col">Cash</th>
                <th scope="col">UPI</th>
                <th scope="col">Card</th>
                {sum.other > 0 && <th scope="col">Other</th>}
                <th scope="col">Collected</th>
                <th scope="col">Expenses</th>
                <th scope="col">Left</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, label, href, totals: t }) => {
                const c = collected(t);
                return (
                  <tr key={key} className={`border-b border-line/60 last:border-0 [&>td]:px-4 [&>td]:py-2.5 ${t.bills || t.expenses ? "" : "text-ink-3"}`}>
                    <th scope="row" className="px-4 py-2.5 text-left font-[560] whitespace-nowrap">
                      <Link href={href} className="underline decoration-line underline-offset-4 hover:decoration-ink">
                        {label}
                      </Link>
                    </th>
                    <td className="num">{t.bills}</td>
                    <td>
                      <Amount value={t.cash} />
                    </td>
                    <td>
                      <Amount value={t.upi} />
                    </td>
                    <td>
                      <Amount value={t.card} />
                    </td>
                    {sum.other > 0 && (
                      <td>
                        <Amount value={t.other} />
                      </td>
                    )}
                    <td>
                      <Amount value={c} className="font-[650] text-good" />
                    </td>
                    <td>
                      <Amount value={t.expenses} />
                    </td>
                    <td>
                      <Amount value={Math.round((c - t.expenses) * 100) / 100} className="font-[650]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Sheet>
        <p className="mt-3 max-w-[70ch] text-[0.875rem] text-ink-3">
          A bill counts on the day it was made, once it&apos;s paid. A mixed bill adds its cash to Cash and its UPI to UPI. <RecountButton from={range.from} to={range.to} />
        </p>
      </section>
    </div>
  );
}
