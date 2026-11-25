import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { AppwriteException } from "node-appwrite";
import { tables } from "./appwrite/server";
import { requireUser } from "./auth";
import { parseSplit } from "./data";
import { daysBetween } from "./periods";
import { TENDERS, istDateKey, istDayStart, tenders, type Tender } from "./billing";

/*
 * Reports (collection by week, month and year; items sold) add up a lot of bills, and Appwrite bills every row read.
 * So each finished day is added up once and kept as one row in `day_totals`. A report reads those rows (one per day)
 * and only goes back to the bills for today, which is still changing, and for days that have no row yet.
 * Changing a bill or an expense of a past day deletes that day's row (dayChanged), so it is added up again next time.
 */

/** A day's money, in rupees. Collected amounts are split by how they came in; a mixed bill adds to each of its parts. */
export type DayTotals = { bills: number; billed: number; paidBills: number; dueBills: number; due: number; expenses: number } & Record<Tender, number>;
/** Quantity and amount sold per item name, counting every bill of the day whether paid yet or not. */
export type DayItems = Record<string, [qty: number, amount: number]>;
export type DaySummary = DayTotals & { day: string; items: DayItems };

const NO_TOTALS: DayTotals = { bills: 0, billed: 0, paidBills: 0, dueBills: 0, due: 0, expenses: 0, cash: 0, upi: 0, card: 0, other: 0 };
const MONEY: (keyof DayTotals)[] = ["billed", "due", "expenses", ...TENDERS];

export const collected = (t: DayTotals) => TENDERS.reduce((s, k) => s + Math.round(t[k] * 100), 0) / 100;

/** Adds days together, in paise so a year of bills doesn't drift. */
export function addTotals(days: DayTotals[]): DayTotals {
  const sum = { ...NO_TOTALS };
  for (const d of days) {
    sum.bills += d.bills;
    sum.paidBills += d.paidBills;
    sum.dueBills += d.dueBills;
    for (const k of MONEY) sum[k] += Math.round(d[k] * 100);
  }
  for (const k of MONEY) sum[k] /= 100;
  return sum;
}

/** Row id for a café's day: fixed, so the row can be written or deleted without looking it up first. */
const rowId = (userId: string, day: string) => `d${createHash("sha256").update(`${userId}|${day}`).digest("hex").slice(0, 35)}`;

/** Call before and after changing a bill or expense that belongs to `day`. Today is always added up live, so it needs nothing. */
export async function dayChanged(userId: string, day: string) {
  if (day >= istDateKey()) return;
  try {
    await tables.dayTotals.delete(rowId(userId, day));
  } catch (e) {
    if (!(e instanceof AppwriteException && e.code === 404)) throw e;
  }
}

type BillRow = { issuedAt: string; paymentMode?: string | null; paymentSplit?: string | null; status?: string | null; total?: number | null; lines?: string | null };

function summarize(days: string[], bills: BillRow[], expenses: { day: string; amount: number }[]): DaySummary[] {
  // Worked in paise, stored in rupees.
  const byDay = new Map(days.map((day) => [day, { day, ...NO_TOTALS, items: {} as DayItems }]));
  for (const b of bills) {
    const s = byDay.get(istDateKey(new Date(b.issuedAt)));
    if (!s) continue;
    const total = Math.round((b.total ?? 0) * 100);
    s.bills += 1;
    s.billed += total;
    if ((b.status ?? "paid") === "paid") {
      s.paidBills += 1;
      const mode = (b.paymentMode ?? "cash") as Tender | "mixed";
      for (const [tender, amount] of tenders({ paymentMode: mode, paymentSplit: parseSplit(b.paymentSplit), total: b.total ?? 0 })) s[tender] += Math.round(amount * 100);
    } else {
      s.dueBills += 1;
      s.due += total;
    }
    try {
      for (const l of JSON.parse(b.lines || "[]") as { name: string; qty: number; amount: number }[]) {
        const e = (s.items[l.name] ??= [0, 0]);
        e[0] += l.qty;
        e[1] += Math.round(l.amount * 100);
      }
    } catch {}
  }
  for (const e of expenses) {
    const s = byDay.get(e.day);
    if (s) s.expenses += Math.round(e.amount * 100);
  }
  for (const s of byDay.values()) {
    for (const k of MONEY) s[k] /= 100;
    for (const e of Object.values(s.items)) e[1] /= 100;
  }
  return [...byDay.values()];
}

async function billsBetween(userId: string, from: string, to: string) {
  const out: BillRow[] = [];
  let cursor: string | undefined;
  for (;;) {
    const res = await tables.invoices.list({
      queries: (q) => [
        q.equal("ownerId", userId),
        q.greaterThanEqual("issuedAt", istDayStart(from)),
        q.lessThan("issuedAt", istDayStart(to, 1)),
        q.orderAsc("issuedAt"),
        q.select(["$id", "issuedAt", "paymentMode", "paymentSplit", "status", "total", "lines"]),
        q.limit(1000),
        ...(cursor ? [q.cursorAfter(cursor)] : []),
      ],
    });
    out.push(...res.rows);
    if (res.rows.length < 1000) return out;
    cursor = res.rows[res.rows.length - 1].$id;
  }
}

async function expensesBetween(userId: string, from: string, to: string) {
  const res = await tables.expenses.list({
    queries: (q) => [q.equal("ownerId", userId), q.greaterThanEqual("day", from), q.lessThanEqual("day", to), q.select(["day", "amount"]), q.limit(5000)],
  });
  return res.rows.map((r) => ({ day: r.day, amount: r.amount }));
}

const parse = <T,>(json: string | null | undefined, fallback: T): T => {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** The longest stretch a report covers: a financial year, with room for a leap day. */
export const MAX_REPORT_DAYS = 366;

/** One summary per day from `from` to `to` (IST dates, both inclusive), oldest first. Days after today are left out. */
export async function daySummaries(from: string, to: string): Promise<DaySummary[]> {
  const user = await requireUser();
  const today = istDateKey();
  const end = to < today ? to : today;
  const days = daysBetween(from, end).slice(-MAX_REPORT_DAYS);
  if (!days.length) return [];
  const first = days[0];

  const stored = await tables.dayTotals.list({
    queries: (q) => [q.equal("ownerId", user.id), q.greaterThanEqual("day", first), q.lessThanEqual("day", end), q.select(["day", "totals", "items"]), q.limit(MAX_REPORT_DAYS + 1)],
  });
  const known = new Map<string, DaySummary>(stored.rows.map((r) => [r.day, { day: r.day, ...NO_TOTALS, ...parse<Partial<DayTotals>>(r.totals, {}), items: parse<DayItems>(r.items, {}) }]));

  // Days still to add up, grouped into unbroken stretches so each stretch is one read of the bills.
  const missing = days.filter((d) => d === today || !known.has(d));
  const stretches: string[][] = [];
  for (const d of missing) {
    const last = stretches[stretches.length - 1];
    if (last && daysBetween(last[last.length - 1], d).length === 2) last.push(d);
    else stretches.push([d]);
  }
  const fresh = (
    await Promise.all(
      stretches.map(async (s) => {
        const [bills, expenses] = await Promise.all([billsBetween(user.id, s[0], s[s.length - 1]), expensesBetween(user.id, s[0], s[s.length - 1])]);
        return summarize(s, bills, expenses);
      }),
    )
  ).flat();
  for (const s of fresh) known.set(s.day, s);

  // Keep the finished days, after the page has been sent. Today isn't kept: it's still changing.
  const finished = fresh.filter((s) => s.day < today);
  if (finished.length) after(() => keep(user.id, finished));

  return days.map((d) => known.get(d)!);
}

async function keep(userId: string, summaries: DaySummary[]) {
  for (let i = 0; i < summaries.length; i += 8) {
    await Promise.all(
      summaries.slice(i, i + 8).map(async ({ day, items, ...totals }) => {
        const data = { ownerId: userId, day, totals: JSON.stringify(totals), items: JSON.stringify(items) };
        try {
          await tables.dayTotals.create(data, { rowId: rowId(userId, day) });
        } catch (e) {
          // Another page view kept this day first; both worked from the same bills.
          if (!(e instanceof AppwriteException && e.code === 409)) console.error("day totals: couldn't keep", day, e instanceof AppwriteException ? e.type : e);
        }
      }),
    );
  }
}

/** Forgets the kept totals for a range so the next report adds them up from the bills again. */
export async function forgetDays(userId: string, from: string, to: string) {
  await tables.dayTotals.deleteMany({ queries: (q) => [q.equal("ownerId", userId), q.greaterThanEqual("day", from), q.lessThanEqual("day", to)] });
}

export type Expense = { id: string; description: string; amount: number; at: string };

/** A day's expenses (today's when no day is given) in the order they were written down. */
export async function getExpenses(on?: string): Promise<Expense[]> {
  const user = await requireUser();
  const day = on ?? istDateKey();
  const res = await tables.expenses.list({ queries: (q) => [q.equal("ownerId", user.id), q.equal("day", day), q.orderAsc("at"), q.limit(500)] });
  return res.rows.map((r) => ({ id: r.$id, description: r.description, amount: r.amount, at: r.at }));
}
