"use server";

import { refresh } from "next/cache";
import { tables } from "../appwrite/server";
import { requireUser } from "../auth";
import { istDateKey, parseYmd } from "../billing";
import { dayChanged, forgetDays } from "../reports";

/** Writes down money spent out of a day's collection. `day` is an IST date, today or earlier. */
export async function addExpense(day: string, description: string, amount: number): Promise<{ error: string } | void> {
  const user = await requireUser();
  const on = parseYmd(day);
  if (!on || on > istDateKey()) return { error: "Pick today or an earlier day." };
  const what = String(description ?? "").trim().slice(0, 255);
  if (!what) return { error: "Write what the money was spent on." };
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise <= 0) return { error: "Enter the amount spent." };
  if (paise > 1_00_00_000_00) return { error: "That amount is too large for one expense." };
  await dayChanged(user.id, on);
  await tables.expenses.create({ ownerId: user.id, day: on, description: what, amount: paise / 100, at: new Date().toISOString() });
  await dayChanged(user.id, on);
  refresh();
}

export async function deleteExpense(id: string) {
  const user = await requireUser();
  const row = await tables.expenses.get(id).catch(() => null);
  if (row && row.ownerId === user.id) {
    await dayChanged(user.id, row.day);
    await tables.expenses.delete(id);
    await dayChanged(user.id, row.day);
  }
  refresh();
}

/** Adds a range of days up from the bills again, in case a kept total has gone out of step. */
export async function recountDays(from: string, to: string) {
  const user = await requireUser();
  const [a, b] = [parseYmd(from), parseYmd(to)];
  if (a && b && a <= b) await forgetDays(user.id, a, b);
  refresh();
}
