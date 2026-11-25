"use client";

import { useRef, useState, useTransition } from "react";
import { addExpense, deleteExpense, recountDays } from "@/lib/actions/expenses";
import { IconPlus, IconTrash } from "./icons";
import { Button, Input } from "./ui";

/** The line at the foot of the day's sheet where the next expense is written. */
export function AddExpense({ day }: { day: string }) {
  const [pending, start] = useTransition();
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const first = useRef<HTMLInputElement>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await addExpense(day, what, Number(amount));
      if (r?.error) return setError(r.error);
      setError("");
      setWhat("");
      setAmount("");
      first.current?.focus();
    });
  };
  return (
    <form onSubmit={submit} className="grid gap-2 border-t border-line bg-surface-2/40 px-4 py-4 sm:px-5">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
        <label className="grid gap-1">
          <span className="label">Spent on</span>
          <Input ref={first} value={what} onChange={(e) => setWhat(e.target.value)} maxLength={255} placeholder="Milk, gas cylinder, staff tea…" className="h-12 text-[1.0625rem]" />
        </label>
        <label className="grid gap-1">
          <span className="label">Amount</span>
          <span className="relative">
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">
              ₹
            </span>
            <Input inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" className="num h-12 pl-7 text-[1.0625rem] font-[600]" />
          </span>
        </label>
        <Button type="submit" variant="primary" className="h-12" disabled={pending || !what.trim() || !(Number(amount) > 0)}>
          <IconPlus className="size-4" /> {pending ? "Adding…" : "Add expense"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-bad">
          {error}
        </p>
      )}
    </form>
  );
}

export function DeleteExpense({ id, description }: { id: string; description: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Remove ${description}`}
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove "${description}" from this day's expenses?`)) start(() => deleteExpense(id));
      }}
      className="press grid size-10 place-items-center rounded-lg text-ink-3 hover:bg-bad/10 hover:text-bad disabled:opacity-40"
    >
      <IconTrash className="size-[1.125rem]" />
    </button>
  );
}

/** Safety valve: adds the shown dates up from the bills again. */
export function RecountButton({ from, to }: { from: string; to: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => recountDays(from, to))} className="underline underline-offset-4 hover:text-ink disabled:opacity-50">
      {pending ? "Adding up again…" : "Numbers look wrong? Add them up again from the bills."}
    </button>
  );
}
