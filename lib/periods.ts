// Calendar periods for the reports, worked out on IST dates written as YYYY-MM-DD. Pure, no I/O.

export type PeriodKind = "day" | "week" | "month" | "year";
export const PERIOD_LABEL: Record<PeriodKind, string> = { day: "Day", week: "Week", month: "Month", year: "Year" };

export type Period = {
  kind: PeriodKind;
  /** First and last day, both inclusive. */
  from: string;
  to: string;
  label: string;
  /** A day inside the period before and after this one. `next` is null when that period hasn't started yet. */
  prev: string;
  next: string | null;
};

const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (day: string, n: number) => ymd(new Date(utc(day).getTime() + n * 86_400_000));

/** Every day from `from` to `to`, both inclusive. */
export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...opts });
const dayMonth = fmt({ day: "numeric", month: "short" });
const dayMonthYear = fmt({ day: "numeric", month: "short", year: "numeric" });
const weekdayDate = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const monthYear = fmt({ month: "long", year: "numeric" });
const monthOnly = fmt({ month: "long" });
const weekdayShort = fmt({ weekday: "short", day: "numeric", month: "short" });

export const formatDay = (day: string) => weekdayDate.format(utc(day));
export const formatDayShort = (day: string) => weekdayShort.format(utc(day));
export const formatMonth = (day: string) => monthYear.format(utc(day));
export const formatMonthName = (day: string) => monthOnly.format(utc(day));

/**
 * The day, week (Monday to Sunday), month or financial year (April to March) that contains `at`.
 * The year is the financial year because that's how bills are numbered and GST is filed.
 */
export function resolvePeriod(kind: PeriodKind, at: string, today: string): Period {
  const d = utc(at);
  const [y, m] = [d.getUTCFullYear(), d.getUTCMonth()];
  let from: string, to: string, label: string;
  if (kind === "day") {
    from = to = at;
    label = at === today ? `Today, ${dayMonthYear.format(d)}` : formatDay(at);
  } else if (kind === "week") {
    from = addDays(at, -((d.getUTCDay() + 6) % 7));
    to = addDays(from, 6);
    label = `${dayMonth.format(utc(from))} to ${dayMonthYear.format(utc(to))}`;
  } else if (kind === "month") {
    from = ymd(new Date(Date.UTC(y, m, 1)));
    to = ymd(new Date(Date.UTC(y, m + 1, 0)));
    label = formatMonth(from);
  } else {
    const start = m >= 3 ? y : y - 1;
    from = `${start}-04-01`;
    to = `${start + 1}-03-31`;
    label = `April ${start} to March ${start + 1}`;
  }
  const next = addDays(to, 1);
  return { kind, from, to, label, prev: addDays(from, -1), next: next <= today ? next : null };
}

export const parsePeriodKind = (v: unknown, fallback: PeriodKind): PeriodKind => (v === "day" || v === "week" || v === "month" || v === "year" ? v : fallback);

export type Range = { kind: PeriodKind | "custom"; from: string; to: string; label: string; prev: string | null; next: string | null; at: string };

const isYmd = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(utc(v).getTime());

/**
 * The stretch of days a report covers, from its URL: `?period=week&at=2026-11-25`, or `?from=…&to=…` for hand-picked dates.
 * Never runs past today, and never longer than a year.
 */
export function resolveRange(sp: Record<string, string | string[] | undefined>, today: string, fallback: PeriodKind): Range {
  if (isYmd(sp.from) || isYmd(sp.to)) {
    let from = isYmd(sp.from) ? sp.from : (sp.to as string);
    let to = isYmd(sp.to) ? sp.to : today;
    if (from > to) [from, to] = [to, from];
    if (to > today) to = today;
    if (from > to) from = to;
    if (from < addDays(to, -365)) from = addDays(to, -365);
    const label = from === to ? formatDay(from) : `${dayMonthYear.format(utc(from))} to ${dayMonthYear.format(utc(to))}`;
    return { kind: "custom", from, to, label, prev: null, next: null, at: to };
  }
  const kind = parsePeriodKind(sp.period, fallback);
  const at = isYmd(sp.at) && sp.at <= today ? sp.at : today;
  const p = resolvePeriod(kind, at, today);
  return { ...p, at };
}
