import Form from "next/form";
import Link from "@/components/link";
import { PERIOD_LABEL, type PeriodKind, type Range } from "@/lib/periods";
import { IconBack, IconChevron } from "./icons";
import { Button, Input } from "./ui";

const step = "press grid size-11 place-items-center rounded-lg border border-line bg-surface text-ink hover:border-ink-3";

/**
 * Picks the days a report covers: Week / Month / Year with earlier and later arrows, or hand-picked dates.
 * Everything is a link or a GET form, so the choice lives in the URL. `keep` carries the page's other parameters along.
 */
export function PeriodBar({ path, range, kinds, today, keep = {} }: { path: string; range: Range; kinds: PeriodKind[]; today: string; keep?: Record<string, string> }) {
  const href = (kind: PeriodKind, at: string) => `${path}?${new URLSearchParams({ ...keep, period: kind, ...(at === today ? {} : { at }) })}`;
  const kind = range.kind === "custom" ? null : range.kind;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label="Period" className="flex rounded-lg bg-surface-2 p-1">
          {kinds.map((k) => (
            <Link
              key={k}
              href={href(k, range.kind === "custom" ? today : range.at)}
              aria-current={kind === k ? "true" : undefined}
              className={`press flex h-10 items-center rounded-md px-4 text-[1rem] font-[600] ${kind === k ? "bg-surface text-ink ring-1 ring-line" : "text-ink-2 hover:text-ink"}`}
            >
              {PERIOD_LABEL[k]}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {kind && range.prev && (
            <Link href={href(kind, range.prev)} aria-label={`Earlier ${PERIOD_LABEL[kind].toLowerCase()}`} className={step}>
              <IconBack className="size-5" />
            </Link>
          )}
          <p className="title px-1">{range.label}</p>
          {kind &&
            (range.next ? (
              <Link href={href(kind, range.next)} aria-label={`Later ${PERIOD_LABEL[kind].toLowerCase()}`} className={step}>
                <IconChevron className="size-5" />
              </Link>
            ) : (
              <span aria-hidden className={`${step} opacity-35`}>
                <IconChevron className="size-5" />
              </span>
            ))}
        </div>
      </div>
      <Form action={path} className="flex flex-wrap items-end gap-2">
        {Object.entries(keep).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="grid gap-1">
          <span className="label">From</span>
          <Input type="date" name="from" defaultValue={range.from} max={today} className="w-[10.5rem]" />
        </label>
        <label className="grid gap-1">
          <span className="label">To</span>
          <Input type="date" name="to" defaultValue={range.to > today ? today : range.to} max={today} className="w-[10.5rem]" />
        </label>
        <Button type="submit">Show these dates</Button>
      </Form>
    </div>
  );
}

export function ReportTabs({ current, query = "" }: { current: "collection" | "items"; query?: string }) {
  const tabs = [
    { id: "collection", href: `/reports${query}`, label: "Collection" },
    { id: "items", href: `/reports/items${query}`, label: "Items sold" },
  ] as const;
  return (
    <nav aria-label="Reports" className="mb-6 flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={current === t.id ? "page" : undefined}
          className={`-mb-px border-b-[3px] pb-2.5 text-[1.125rem] font-[620] ${current === t.id ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
