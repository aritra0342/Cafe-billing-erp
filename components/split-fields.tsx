"use client";

import { formatINR, PAYMENT_LABEL, type PaymentSplit } from "@/lib/billing";
import { inputClass } from "./ui";

const FIELDS = ["cash", "upi", "card"] as const;
type SplitField = (typeof FIELDS)[number];

/**
 * A mixed payment being typed in. The cashier types the parts they know; one field (`rest`) isn't typed and
 * always holds whatever is left of the bill, so the parts add up without any arithmetic at the counter.
 */
export type SplitDraft = { typed: Partial<Record<SplitField, string>>; rest: SplitField };
export const NEW_SPLIT: SplitDraft = { typed: {}, rest: "upi" };

const paise = (v: string | undefined) => Math.max(0, Math.round(Number(v || 0) * 100)) || 0;

/** The amounts a draft stands for against a bill total, and how far the typed parts overshoot it (0 when they fit). */
export function splitParts(draft: SplitDraft, total: number): { parts: PaymentSplit; over: number } {
  const typed = FIELDS.filter((f) => f !== draft.rest).map((f) => [f, paise(draft.typed[f])] as const);
  const left = Math.round(total * 100) - typed.reduce((s, [, p]) => s + p, 0);
  const parts: PaymentSplit = {};
  for (const [f, p] of typed) if (p > 0) parts[f] = p / 100;
  if (left > 0) parts[draft.rest] = left / 100;
  return { parts, over: left < 0 ? -left / 100 : 0 };
}

export function SplitFields({ total, value, onChange, className = "" }: { total: number; value: SplitDraft; onChange: (v: SplitDraft) => void; className?: string }) {
  const { parts, over } = splitParts(value, total);
  const type = (field: SplitField, text: string) => {
    const typed = { ...value.typed, [field]: text.replace(/[^\d.]/g, "") };
    // Typing in the field that was taking the rest hands that job to another one.
    const rest = field === value.rest ? (field === "upi" ? "cash" : "upi") : value.rest;
    delete typed[rest];
    onChange({ typed, rest });
  };
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((f) => {
          const isRest = f === value.rest;
          return (
            <label key={f} className="grid gap-1">
              <span className="label">{PAYMENT_LABEL[f]}</span>
              <span className="relative">
                <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`${PAYMENT_LABEL[f]} amount${isRest ? ", filled in with the rest of the bill" : ""}`}
                  aria-invalid={over > 0 && !isRest}
                  className={`${inputClass} num h-12 pl-7 text-[1.0625rem] font-[600] ${isRest ? "border-dashed bg-surface-2/60" : ""}`}
                  value={isRest ? String(parts[f] ?? 0) : (value.typed[f] ?? "")}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => type(f, e.target.value)}
                />
              </span>
            </label>
          );
        })}
      </div>
      {over > 0 ? (
        <p role="alert" className="text-[0.875rem] text-bad">
          That&apos;s {formatINR(over)} more than the bill of {formatINR(total)}.
        </p>
      ) : (
        <p className="text-[0.875rem] leading-snug text-ink-3">
          Type what you got in one way; {PAYMENT_LABEL[value.rest]} fills in with the rest of {formatINR(total)}.
        </p>
      )}
    </div>
  );
}
