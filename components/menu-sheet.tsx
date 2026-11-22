"use client";

import { useRef, useState, useTransition } from "react";
import { applyMenuSheet, previewMenuSheet } from "@/lib/actions/menu";
import type { MenuPlan } from "@/lib/menu-sheet";
import { Button, buttonClass } from "./ui";
import { IconClose, IconDownload } from "./icons";

/** Broad on purpose: Android file pickers grey out files whose type they don't recognise, and WhatsApp downloads often arrive as octet-stream. */
const SHEET_TYPES = ".xlsx,.csv,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/octet-stream";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Download the menu as Excel, edit it, upload it back, review the changes, then save. */
export function MenuSheet({ hasItems }: { hasItems: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<MenuPlan | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();

  const form = (f: File) => {
    const fd = new FormData();
    fd.set("file", f);
    if (removeMissing) fd.set("removeMissing", "on");
    return fd;
  };

  const choose = (f: File | undefined) => {
    if (input.current) input.current.value = ""; // so picking the same file again still triggers
    setError("");
    setDone("");
    if (!f) return;
    // No check on the name: phones often hand over files without an extension. The server reads the contents.
    startReading(async () => {
      const r = await previewMenuSheet(form(f)).catch(() => ({ ok: false as const, error: "The sheet couldn't be sent. Check the internet connection and try again." }));
      if (!r.ok) return setError(r.error);
      setFile(f);
      setPlan(r.plan);
      setRemoveMissing(false);
      dialog.current?.showModal();
    });
  };

  const apply = () =>
    startSaving(async () => {
      if (!file) return;
      const r = await applyMenuSheet(form(file)).catch(() => ({ ok: false as const, error: "The changes couldn't be sent. Check the internet connection, then upload the sheet again." }));
      dialog.current?.close();
      if (!r.ok) return setError(r.error);
      const parts = [r.added && `${plural(r.added, "item")} added`, r.changed && `${plural(r.changed, "item")} updated`, r.removed && `${plural(r.removed, "item")} removed`, r.categories && `${plural(r.categories, "new category", "new categories")}`].filter(Boolean);
      setDone(parts.length ? `Menu updated: ${parts.join(", ")}.` : "Nothing to change. The menu already matches the sheet.");
    });

  const changes = plan ? plan.added.length + plan.changed.length + (removeMissing ? plan.missing.length : 0) : 0;

  return (
    <section aria-labelledby="sheet-title" className="mb-10 grid gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <h2 id="sheet-title" className="font-[650]">Update from Excel</h2>
        <p className="mt-0.5 text-[0.9375rem] text-ink-2">
          {hasItems ? "Download the menu, change prices or add items in Excel or Google Sheets, then upload it as .xlsx or .csv. You'll see every change before it's saved." : "Fill in the sheet in Excel or Google Sheets and upload it (.xlsx or .csv) to build the whole menu at once."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="/menu/export" download className={buttonClass("secondary", "md")}>
          <IconDownload className="size-4" /> {hasItems ? "Download menu" : "Download blank sheet"}
        </a>
        <Button variant="primary" disabled={reading} onClick={() => input.current?.click()}>
          {reading ? "Reading sheet…" : "Upload sheet"}
        </Button>
        <input ref={input} type="file" accept={SHEET_TYPES} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => choose(e.target.files?.[0])} />
      </div>
      {error && (
        <p role="alert" className="text-bad sm:col-span-2">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="font-[560] text-good sm:col-span-2">
          {done}
        </p>
      )}

      <dialog ref={dialog} className="sheet m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink">
        {plan && (
          <div className="grid gap-6 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="title">Check the changes</h2>
                <p className="mt-1 text-ink-2">
                  From {file?.name}. {plan.unchanged > 0 && `${plural(plan.unchanged, "item")} already match${plan.unchanged === 1 ? "es" : ""} and won't change.`}
                </p>
              </div>
              <Button variant="ghost" size="sm" aria-label="Close" onClick={() => dialog.current?.close()}>
                <IconClose className="size-4" />
              </Button>
            </div>

            {plan.problems.length > 0 && (
              <Group title={`${plural(plan.problems.length, "row")} skipped`} tone="bad">
                {plan.problems.map((p, i) => (
                  <li key={i}>
                    {p.row > 0 && <span className="num text-ink-3">Row {p.row}: </span>}
                    {p.message}
                  </li>
                ))}
              </Group>
            )}
            {plan.newCategories.length > 0 && <Group title={`New ${plan.newCategories.length === 1 ? "category" : "categories"}`}>{plan.newCategories.map((c) => <li key={c}>{c}</li>)}</Group>}
            {plan.added.length > 0 && (
              <Group title={`${plural(plan.added.length, "new item")}`}>
                {plan.added.map((a) => (
                  <li key={a.row} className="flex justify-between gap-4">
                    <span>
                      {a.name} <span className="text-ink-3">in {a.category}</span>
                    </span>
                    <span className="money shrink-0">{a.price}</span>
                  </li>
                ))}
              </Group>
            )}
            {plan.changed.length > 0 && (
              <Group title={`${plural(plan.changed.length, "item")} changed`}>
                {plan.changed.map((c) => (
                  <li key={c.id}>
                    <span className="font-[600]">{c.name}</span>
                    <span className="block text-[0.9375rem] text-ink-2">{c.changes.join(". ")}</span>
                  </li>
                ))}
              </Group>
            )}
            {plan.missing.length > 0 && (
              <div className="grid gap-2 rounded-lg bg-surface-2/60 p-4">
                <p>
                  {plural(plan.missing.length, "item")} on your menu {plan.missing.length === 1 ? "isn't" : "aren't"} in the sheet: {plan.missing.slice(0, 6).map((m) => m.name).join(", ")}
                  {plan.missing.length > 6 && ` and ${plan.missing.length - 6} more`}.
                </p>
                <label className="flex items-center gap-2.5 font-[560]">
                  <input type="checkbox" className="size-4 accent-[var(--bad)]" checked={removeMissing} onChange={(e) => setRemoveMissing(e.target.checked)} />
                  Remove {plan.missing.length === 1 ? "it" : "them"} from the menu
                </label>
                <p className="text-[0.875rem] text-ink-3">Left unticked, {plan.missing.length === 1 ? "it stays" : "they stay"} as {plan.missing.length === 1 ? "it is" : "they are"}. Bills already issued are never affected.</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => dialog.current?.close()}>Cancel</Button>
              <Button variant="primary" disabled={saving || changes === 0} onClick={apply}>
                {saving ? "Saving…" : changes === 0 ? "Nothing to change" : `Save ${plural(changes, "change")}`}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

function Group({ title, tone, children }: { title: string; tone?: "bad"; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="label">{tone === "bad" ? <span className="text-bad">{title}</span> : title}</h3>
      <ul className="grid gap-2 border-t border-line pt-2">{children}</ul>
    </section>
  );
}
