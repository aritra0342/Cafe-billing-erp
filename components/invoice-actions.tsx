"use client";

import Link from "@/components/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { deleteInvoice, setInvoiceStatus, setInvoiceTemplate } from "@/lib/actions/invoices";
import { formatINR, formatTime, paidByLabel, PAYMENT_LABEL, type PaymentMode, type PaymentSplit, type PaymentStatus, type Tender } from "@/lib/billing";
import { NEW_SPLIT, SplitFields, splitParts } from "./split-fields";
import { TEMPLATES } from "@/lib/templates";
import { Button, buttonClass } from "./ui";
import { IconBack, IconEdit, IconPlus, IconPrint, IconTrash, IconWhatsApp } from "./icons";

export type SlipKind = "full" | "changes";

/** Prints the invoice. On thermal rolls the page is sized to the receipt so the printer doesn't feed blank paper. */
export function printInvoice(paper: string) {
  printSized(".print-paper", paper);
}

/** Prints only a kitchen slip (the whole order, or just the latest changes), then puts the page back to printing the bill. */
export function printKitchenSlip(paper: string, kind: SlipKind = "full") {
  const root = document.documentElement;
  const style = document.getElementById("page-size") as HTMLStyleElement | null;
  const before = style?.textContent ?? "";
  root.dataset.print = "kitchen";
  root.dataset.slip = kind;
  const restore = () => {
    delete root.dataset.print;
    delete root.dataset.slip;
    if (style) style.textContent = before;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  printSized(`.kitchen-slip[data-kind="${kind}"]`, paper);
}

/**
 * Prints a kitchen slip as soon as a bill opens from the counter (`?kot=1`) or from an edit (`?kot=changes`),
 * then drops the flag from the address so a reload doesn't print it again.
 */
export function AutoPrintSlip({ paper, kind }: { paper: string; kind: SlipKind }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("kot");
    window.history.replaceState(window.history.state, "", url);
    // Wait a frame so the slip is laid out and can be measured for the roll.
    const raf = requestAnimationFrame(() => printKitchenSlip(paper, kind));
    return () => cancelAnimationFrame(raf);
  }, [paper, kind]);
  return null;
}

function printSized(selector: string, paper: string) {
  const style = document.getElementById("page-size") as HTMLStyleElement | null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (style && el && (paper === "80mm" || paper === "58mm")) {
    // A page wider than it is tall counts as landscape, and Chrome turns it sideways on the roll: the 80 mm
    // becomes the height and the printer feeds ~20 cm per short slip. Never go below a square, so it stays portrait.
    const width = parseInt(paper, 10);
    const mm = Math.max(Math.ceil((el.getBoundingClientRect().height * 25.4) / 96) + 4, width + 2);
    style.textContent = `@page { size: ${paper} ${mm}mm; margin: 0; }`;
  }
  window.print();
}

function whatsappHref(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function InvoiceActions({
  id,
  templateId,
  paper,
  slipPaper,
  isNew,
  shareText,
  phone,
  hasChanges,
}: {
  id: string;
  templateId: string;
  paper: string;
  slipPaper: string;
  isNew: boolean;
  shareText: string;
  phone: string;
  /** The bill has been edited, so a slip of the latest changes can be reprinted. */
  hasChanges: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [switching, startSwitch] = useTransition();
  // The button lights up on press; the paper follows once the server has saved and re-rendered it.
  const [shownTemplate, showTemplate] = useOptimistic(templateId);

  const switchTemplate = (next: string) =>
    startSwitch(async () => {
      showTemplate(next);
      await setInvoiceTemplate(id, next);
    });

  return (
    <div className="no-print mb-8 grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={isNew ? "/invoices/new" : "/invoices"} className={buttonClass("ghost", "sm", "-ml-3")}>
          <IconBack className="size-4" /> {isNew ? "Counter" : "All bills"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isNew && (
            <Link href="/invoices/new" className={buttonClass("secondary", "md")}>
              <IconPlus className="size-4" /> Next bill
            </Link>
          )}
          <a href={whatsappHref(phone, shareText)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "md")}>
            <IconWhatsApp className="size-4" /> Send on WhatsApp
          </a>
          <Link href={`/invoices/${id}/edit`} className={buttonClass("secondary", "md")}>
            <IconEdit className="size-4" /> Edit items
          </Link>
          <Button onClick={() => printKitchenSlip(slipPaper)}>
            <IconPrint className="size-4" /> Kitchen slip
          </Button>
          {hasChanges && (
            <Button onClick={() => printKitchenSlip(slipPaper, "changes")} title="Prints only what was added or cancelled in the latest edit">
              <IconPrint className="size-4" /> Changes slip
            </Button>
          )}
          <Button variant="primary" disabled={switching} onClick={() => printInvoice(paper)}>
            <IconPrint className="size-4" /> Print
          </Button>
          <Button variant="ghost" aria-label="Delete bill" title="Delete bill" onClick={() => dialog.current?.showModal()}>
            <IconTrash className="size-4" />
          </Button>
        </div>
      </div>

      <div role="group" aria-labelledby="layout-label" className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <span id="layout-label" className="label mr-2">
          Layout
        </span>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTemplate(t.id)}
            aria-pressed={t.id === shownTemplate}
            className={`press rounded-md px-3 py-1.5 text-[0.9375rem] font-[560] ${t.id === shownTemplate ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <dialog ref={dialog} className="sheet m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-6 text-ink">
        <h2 className="title">Delete this bill?</h2>
        <p className="mt-2 text-ink-2">
          It can&apos;t be brought back, and its number stays unused, leaving a gap in this year&apos;s sequence. GST expects bill numbers to run in order, so delete only a bill made by mistake.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => dialog.current?.close()} autoFocus>
            Keep bill
          </Button>
          <Button variant="danger" className="border border-bad/30" disabled={pending} onClick={() => start(() => deleteInvoice(id))}>
            {pending ? "Deleting…" : "Delete bill"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}

const MODES: Tender[] = ["upi", "cash", "card", "other"];

/**
 * Due bills show in red with one tap per payment mode to settle them; paid bills show in green with how and when.
 * "Mixed" opens amount fields for a bill settled partly one way and partly another.
 */
export function PaymentBar({ id, status, paymentMode, paymentSplit, paidAt, total }: { id: string; status: PaymentStatus; paymentMode: PaymentMode; paymentSplit: PaymentSplit; paidAt: string; total: number }) {
  const [pending, start] = useTransition();
  const [shown, show] = useOptimistic({ status, paymentMode, paymentSplit });
  const [splitting, setSplitting] = useState(false);
  const [split, setSplit] = useState(NEW_SPLIT);
  const [error, setError] = useState("");
  const set = (next: PaymentStatus, mode?: PaymentMode, parts?: PaymentSplit) =>
    start(async () => {
      setError("");
      show({ status: next, paymentMode: mode ?? paymentMode, paymentSplit: parts ?? {} });
      const r = await setInvoiceStatus(id, next, mode, parts);
      if (r?.error) setError(r.error);
      else setSplitting(false);
    });
  const draft = splitParts(split, total);

  if (shown.status === "due") {
    return (
      <div role="region" aria-label="Payment" className="no-print mb-6 rounded-xl border-2 border-bad/40 bg-bad/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-bad">
            <span className="text-[1.125rem] font-[700]">Due</span> <span className="money">{formatINR(total)}</span> not paid yet
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.9375rem] text-ink-2">Mark paid by</span>
            {MODES.map((m) => (
              <Button key={m} size="sm" disabled={pending} onClick={() => set("paid", m)} className="border-good/40 font-[650] text-good hover:bg-good/10">
                {PAYMENT_LABEL[m]}
              </Button>
            ))}
            <Button size="sm" disabled={pending} aria-expanded={splitting} onClick={() => setSplitting((v) => !v)} className={`border-good/40 font-[650] hover:bg-good/10 ${splitting ? "bg-good text-bg hover:bg-good" : "text-good"}`}>
              Mixed
            </Button>
          </div>
        </div>
        {splitting && (
          <div className="mt-3 grid gap-3 border-t border-bad/20 pt-3 sm:grid-cols-[minmax(0,26rem)_auto] sm:items-start sm:justify-end">
            <SplitFields total={total} value={split} onChange={setSplit} />
            <Button variant="primary" className="sm:mt-[1.625rem] sm:h-12" disabled={pending || draft.over > 0} onClick={() => set("paid", "mixed", draft.parts)}>
              {pending ? "Saving…" : "Mark paid"}
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-2 text-bad">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <div role="region" aria-label="Payment" className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-good/40 bg-good/10 px-4 py-3">
      <p className="text-good">
        <span className="text-[1.125rem] font-[700]">Paid</span> by {paidByLabel({ ...shown, total })}
        {paidAt && shown.status === status ? <span className="text-ink-2"> at {formatTime(paidAt)}</span> : null}
      </p>
      <button type="button" disabled={pending} onClick={() => set("due")} className="text-[0.9375rem] text-ink-2 underline-offset-2 hover:text-bad hover:underline">
        Not paid? Mark as due
      </button>
    </div>
  );
}
