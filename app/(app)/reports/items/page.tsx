import { Suspense } from "react";
import Form from "next/form";
import { formatINR, istDateKey } from "@/lib/billing";
import { daySummaries } from "@/lib/reports";
import { formatDay, resolveRange } from "@/lib/periods";
import Link from "@/components/link";
import { PeriodBar, ReportTabs } from "@/components/period-bar";
import { IconBack, IconSearch } from "@/components/icons";
import { Button, EmptyState, Input, PageHeader, Sheet, Skeleton } from "@/components/ui";

export const metadata = { title: "Items sold" };

export default function Page({ searchParams }: PageProps<"/reports/items">) {
  return (
    <>
      <PageHeader title="Reports" description="How many of each item went out, and on which days. Search an item to see its count." />
      <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
        <Items searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const qty = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} pc${n === 1 ? "" : "s"}`;

async function Items({ searchParams }: Pick<PageProps<"/reports/items">, "searchParams">) {
  const sp = await searchParams;
  const today = istDateKey();
  const range = resolveRange(sp, today, "month");
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const picked = typeof sp.item === "string" ? sp.item : "";
  const days = await daySummaries(range.from, range.to);

  const sold = new Map<string, { qty: number; paise: number }>();
  for (const d of days)
    for (const [name, [n, amount]] of Object.entries(d.items)) {
      const e = sold.get(name) ?? { qty: 0, paise: 0 };
      sold.set(name, { qty: e.qty + n, paise: e.paise + Math.round(amount * 100) });
    }
  const all = [...sold].map(([name, v]) => ({ name, qty: v.qty, amount: v.paise / 100 })).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  const needle = q.toLowerCase();
  const list = needle ? all.filter((i) => i.name.toLowerCase().includes(needle)) : all;
  const most = Math.max(1, ...list.map((i) => i.qty));

  const period: Record<string, string> = range.kind === "custom" ? { from: range.from, to: range.to } : { period: range.kind, ...(range.at === today ? {} : { at: range.at }) };
  const url = (extra: Record<string, string>) => `/reports/items?${new URLSearchParams({ ...period, ...extra })}`;
  // One item to show by date: the one tapped, or the only one the search found.
  const one = picked ? (all.find((i) => i.name === picked) ?? { name: picked, qty: 0, amount: 0 }) : needle && list.length === 1 ? list[0] : null;

  return (
    <div className="grid gap-7">
      <div>
        <ReportTabs current="items" query={`?${new URLSearchParams(period)}`} />
        <PeriodBar path="/reports/items" range={range} kinds={["day", "week", "month", "year"]} today={today} keep={{ ...(q ? { q } : {}), ...(picked ? { item: picked } : {}) }} />
      </div>

      <Form action="/reports/items" className="flex max-w-xl items-end gap-2">
        {Object.entries(period).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="grid flex-1 gap-1">
          <span className="label">Find an item</span>
          <span className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" />
            <Input type="search" name="q" defaultValue={q} placeholder="Water, chai, sandwich…" className="h-12 pl-11 text-[1.0625rem]" />
          </span>
        </label>
        <Button type="submit" variant="primary" className="h-12">
          Search
        </Button>
      </Form>

      {one ? (
        <section aria-labelledby="one-h" className="grid max-w-3xl gap-4">
          {(picked || q) && (
            <Link href={url(picked && q ? { q } : {})} className="flex items-center gap-1 justify-self-start font-[560] text-ink-2 hover:text-ink">
              <IconBack className="size-4" /> {picked && q ? `Items matching “${q}”` : "All items"}
            </Link>
          )}
          <div className="rounded-xl bg-accent-soft px-5 py-5">
            <h2 id="one-h" className="title">
              {one.name}
            </h2>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
              <span className="money text-[2.75rem] leading-none">{qty(one.qty)}</span>
              <span className="text-[1.125rem] text-ink-2">
                sold, worth <span className="num font-[650] text-ink">{formatINR(one.amount)}</span>
              </span>
            </p>
            <p className="mt-2 text-ink-2">{range.label}</p>
          </div>
          {one.qty > 0 && (
            <Sheet className="overflow-hidden">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-line text-[0.875rem] text-ink-2 [&>th]:px-5 [&>th]:py-2.5 [&>th]:font-[560]">
                    <th scope="col" className="text-left">
                      Date
                    </th>
                    <th scope="col">Sold</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {days
                    .filter((d) => d.items[one.name]?.[0])
                    .reverse()
                    .map((d) => (
                      <tr key={d.day} className="border-b border-line/60 last:border-0 [&>td]:px-5 [&>td]:py-3">
                        <th scope="row" className="px-5 py-3 text-left font-[560]">
                          {d.day === today ? "Today" : formatDay(d.day)}
                        </th>
                        <td className="num text-[1.125rem] font-[650]">{qty(d.items[one.name][0])}</td>
                        <td className="num">{formatINR(d.items[one.name][1])}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Sheet>
          )}
        </section>
      ) : list.length === 0 ? (
        <EmptyState title={q ? `Nothing called “${q}” was sold` : "Nothing sold in these dates"}>
          {q ? "Check the spelling, or pick a longer period above." : "Items appear here as soon as a bill is saved at the counter."}
        </EmptyState>
      ) : (
        <section aria-labelledby="list-h" className="max-w-3xl">
          <h2 id="list-h" className="title mb-3">
            {q ? `${list.length} items matching “${q}”` : `${list.length} item${list.length === 1 ? "" : "s"} sold`}
          </h2>
          <Sheet>
            <ol>
              {list.map((i) => (
                <li key={i.name} className="border-b border-line/60 last:border-0">
                  <Link href={url({ ...(q ? { q } : {}), item: i.name })} className="press grid grid-cols-[minmax(0,1fr)_auto_6.5rem] items-baseline gap-x-4 px-5 pt-3 pb-2.5 hover:bg-surface-2/50">
                    <span className="truncate text-[1.0625rem] font-[560]">{i.name}</span>
                    <span className="num text-[1.125rem] font-[700]">{qty(i.qty)}</span>
                    <span className="num text-right text-ink-2">{formatINR(i.amount)}</span>
                    <span aria-hidden className="col-span-3 mt-1.5 h-1 rounded-full bg-accent/70" style={{ width: `${Math.max(2, (i.qty / most) * 100)}%` }} />
                  </Link>
                </li>
              ))}
            </ol>
          </Sheet>
          <p className="mt-3 text-[0.875rem] text-ink-3">Counts every bill, paid or still due. Tap an item to see it day by day.</p>
        </section>
      )}
    </div>
  );
}
