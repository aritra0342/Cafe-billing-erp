import { Suspense } from "react";
import Form from "next/form";
import { formatINR, formatTime, istDateKey, PAYMENT_LABEL, TENDERS } from "@/lib/billing";
import { collected, daySummaries, getExpenses } from "@/lib/reports";
import { addDays, formatDay, resolveRange } from "@/lib/periods";
import Link from "@/components/link";
import { AddExpense, DeleteExpense } from "@/components/expense-sheet";
import { IconBack, IconChevron } from "@/components/icons";
import { Button, Input, PageHeader, Sheet, Skeleton } from "@/components/ui";

export const metadata = { title: "Expenses" };

export default function Page({ searchParams }: PageProps<"/expenses">) {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Expenses" description="Write down what was paid out of the day's collection. Each line shows what's left after it." />
      <Suspense fallback={<Skeleton className="h-[55vh] w-full" />}>
        <DaySheet searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const step = "press grid size-11 place-items-center rounded-lg border border-line bg-surface text-ink hover:border-ink-3";
const round = (n: number) => Math.round(n * 100) / 100;

async function DaySheet({ searchParams }: Pick<PageProps<"/expenses">, "searchParams">) {
  const sp = await searchParams;
  const today = istDateKey();
  const day = resolveRange({ period: "day", at: sp.day }, today, "day").at;
  const [[summary], expenses] = await Promise.all([daySummaries(day, day), getExpenses(day)]);
  const got = summary ? collected(summary) : 0;
  const parts = summary ? TENDERS.filter((t) => summary[t] > 0).map((t) => `${PAYMENT_LABEL[t]} ${formatINR(summary[t])}`) : [];
  const spent = round(expenses.reduce((s, e) => s + e.amount, 0));

  // The balance column: what's left of the collection after each expense, carried down the sheet.
  const lines = expenses.reduce<{ id: string; description: string; amount: number; at: string; left: number }[]>((rows, e) => [...rows, { ...e, left: round((rows.at(-1)?.left ?? got) - e.amount) }], []);
  const left = round(got - spent);
  const cols = "grid grid-cols-[minmax(0,1fr)_5.5rem_6rem_2.5rem] items-center gap-x-2 px-4 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_2.5rem] sm:gap-x-4 sm:px-5";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/expenses?day=${addDays(day, -1)}`} aria-label="Day before" className={step}>
            <IconBack className="size-5" />
          </Link>
          <p className="title px-1">{day === today ? `Today, ${formatDay(day)}` : formatDay(day)}</p>
          {day < today ? (
            <Link href={addDays(day, 1) === today ? "/expenses" : `/expenses?day=${addDays(day, 1)}`} aria-label="Day after" className={step}>
              <IconChevron className="size-5" />
            </Link>
          ) : (
            <span aria-hidden className={`${step} opacity-35`}>
              <IconChevron className="size-5" />
            </span>
          )}
        </div>
        <Form action="/expenses" className="flex items-end gap-2">
          <label className="grid gap-1">
            <span className="sr-only">Go to a day</span>
            <Input type="date" name="day" defaultValue={day} max={today} className="w-[10.5rem]" />
          </label>
          <Button type="submit">Go</Button>
        </Form>
      </div>

      <Sheet className="overflow-hidden">
        <div className={`${cols} border-b border-line py-2.5 text-[0.875rem] font-[560] text-ink-2`}>
          <span>What</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance left</span>
          <span />
        </div>

        <div className={`${cols} border-b border-line bg-good/10 py-4`}>
          <div className="min-w-0">
            <p className="text-[1.0625rem] font-[650]">Day&apos;s collection</p>
            <p className="text-[0.875rem] text-ink-2">
              {summary?.paidBills ? `${summary.paidBills} paid bill${summary.paidBills === 1 ? "" : "s"}: ${parts.join(", ")}` : "No paid bills on this day yet"}
            </p>
          </div>
          <span className="num text-right font-[600] text-good">+{formatINR(got)}</span>
          <span className="money text-right text-[1.1875rem]">{formatINR(got)}</span>
          <span />
        </div>

        {lines.length === 0 && <p className="px-5 py-6 text-ink-2">No expenses written for this day. Add the first one below.</p>}
        <ol>
          {lines.map((e, i) => (
            <li key={e.id} className={`${cols} border-b border-line/60 py-3`}>
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-[560] [overflow-wrap:anywhere]">
                  <span className="num mr-2 text-ink-3">{i + 1}.</span>
                  {e.description}
                </p>
                <p className="text-[0.8125rem] text-ink-3">Added {formatTime(e.at)}</p>
              </div>
              <span className="num text-right font-[600] text-bad">−{formatINR(e.amount)}</span>
              <span className={`money text-right text-[1.1875rem] ${e.left < 0 ? "text-bad" : ""}`}>{formatINR(e.left)}</span>
              <DeleteExpense id={e.id} description={e.description} />
            </li>
          ))}
        </ol>

        <AddExpense key={day} day={day} />

        <div className={`${cols} border-t-2 border-rule py-4`}>
          <div>
            <p className="text-[1.125rem] font-[700]">Left after expenses</p>
            <p className="text-[0.875rem] text-ink-2">
              {formatINR(got)} collected, {formatINR(spent)} spent
            </p>
          </div>
          <span />
          <span className={`money text-right text-[1.5rem] ${left < 0 ? "text-bad" : "text-good"}`}>{formatINR(left)}</span>
          <span />
        </div>
      </Sheet>

      {summary && summary.dueBills > 0 && (
        <p className="text-bad">
          {formatINR(summary.due)} is still due on {summary.dueBills} bill{summary.dueBills === 1 ? "" : "s"} from this day. It joins the collection when marked paid.
        </p>
      )}
    </div>
  );
}
