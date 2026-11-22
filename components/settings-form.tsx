"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/lib/actions/settings";
import type { CafeSettings } from "@/lib/data";
import { STATES, type TaxMode } from "@/lib/billing";
import { TEMPLATES } from "@/lib/templates";
import { Button, Field, Input, Segmented, Select, Textarea } from "./ui";
import { LogoField } from "./logo-field";
import { IconCheck } from "./icons";

// Post Sept-2025 slabs: standalone restaurants 5% (no ITC); restaurants in hotels with rooms over ₹7,500/night 18%.
const GST_RATES = [0, 5, 18];

export function SettingsForm({ initial, logo, canSetLogo, welcome }: { initial: CafeSettings; logo: string; canSetLogo: boolean; welcome: boolean }) {
  const [s, setS] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof CafeSettings, string>>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof CafeSettings>(k: K, v: CafeSettings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const onGstin = (raw: string) => {
    const gstin = raw.toUpperCase().replace(/\s/g, "");
    setS((p) => {
      const code = gstin.slice(0, 2);
      const autoState = /^\d{2}$/.test(code) && STATES.some((st) => st.code === code) && !p.stateCode;
      return { ...p, gstin, ...(autoState ? { stateCode: code } : {}) };
    });
    setSaved(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveSettings(s);
      if (r.ok) {
        setErrors({});
        setSaved(true);
        if (welcome) router.push("/menu");
      } else {
        setErrors(r.errors);
        document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      }
    });
  };

  const registered = s.taxMode !== "unregistered";

  return (
    <form onSubmit={submit} className="grid max-w-5xl" noValidate>
      {welcome && (
        <div className="mb-8 rounded-xl bg-accent-soft px-5 py-4">
          <p className="font-[600]">First, the details that go at the top of every bill</p>
          <p className="text-ink-2">Next you&apos;ll add your menu, and then you can start billing.</p>
        </div>
      )}

      <Section title="Your café" description="Printed in the header of every bill. The FSSAI licence number is required on bills for food businesses.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Café name" error={errors.cafeName}>
            <Input required value={s.cafeName} aria-invalid={!!errors.cafeName} onChange={(e) => set("cafeName", e.target.value)} placeholder="Third Wave Corner" />
          </Field>
          <Field label="Legal name" hint="If it's different from the café name, as on your GST certificate.">
            <Input value={s.legalName} onChange={(e) => set("legalName", e.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea rows={2} value={s.address} onChange={(e) => set("address", e.target.value)} placeholder="Shop 4, 12th Main, Indiranagar" />
          </Field>
          <Field label="City">
            <Input value={s.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <div className="grid grid-cols-[1fr_8rem] gap-4">
            <Field label="State" error={errors.stateCode}>
              <Select value={s.stateCode} aria-invalid={!!errors.stateCode} onChange={(e) => set("stateCode", e.target.value)}>
                <option value="">Select…</option>
                {STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="PIN code" error={errors.pincode}>
              <Input inputMode="numeric" maxLength={6} className="num" value={s.pincode} aria-invalid={!!errors.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
          <Field label="Phone">
            <Input type="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={s.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="FSSAI licence no." hint="14 digits. Food businesses must print it on bills." error={errors.fssai}>
            <Input inputMode="numeric" maxLength={14} className="num" value={s.fssai} aria-invalid={!!errors.fssai} onChange={(e) => set("fssai", e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
      </Section>

      <Section title="Logo" description="Printed at the top of every bill, including ones already issued. A plain background around the logo is removed for you.">
        <LogoField initial={logo} enabled={canSetLogo} />
      </Section>

      <Section title="GST" description="Most cafés charge 5%, split on the bill as 2.5% CGST and 2.5% SGST, under service code SAC 9963.">
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <span className="label">Registration</span>
            <Segmented<TaxMode>
              label="GST registration"
              value={s.taxMode}
              onChange={(v) => set("taxMode", v)}
              options={[
                { value: "regular", label: "Regular" },
                { value: "composition", label: "Composition" },
                { value: "unregistered", label: "Not registered" },
              ]}
            />
            <p className="text-[0.875rem] text-ink-2">
              {s.taxMode === "regular" && "Bills are Tax Invoices, with CGST and SGST shown separately."}
              {s.taxMode === "composition" && "Bills are a Bill of Supply. You can't charge GST to customers, and the composition declaration is printed."}
              {s.taxMode === "unregistered" && "Below the GST threshold: plain invoices with no tax lines."}
            </p>
          </div>
          {registered && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GSTIN" error={errors.gstin} hint="Fills in your state from the first two digits.">
                <Input value={s.gstin} maxLength={15} className="uppercase tracking-wide" aria-invalid={!!errors.gstin} onChange={(e) => onGstin(e.target.value)} placeholder="29ABCDE1234F1Z5" />
              </Field>
              {s.taxMode === "regular" && (
                <Field label="GST rate">
                  <Select value={String(s.gstRate)} onChange={(e) => set("gstRate", Number(e.target.value))}>
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%{r === 5 ? " (most cafés)" : r === 18 ? " (inside hotels with rooms over ₹7,500)" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          )}
          {s.taxMode === "regular" && (
            <label className="flex items-start gap-3 text-[0.9375rem]">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={s.pricesIncludeTax} onChange={(e) => set("pricesIncludeTax", e.target.checked)} />
              <span>
                My menu prices already include GST
                <span className="block text-[0.875rem] text-ink-2">The tax is worked out backwards from the price, so the customer pays exactly what the menu says.</span>
              </span>
            </label>
          )}
        </div>
      </Section>

      <Section title="Bills" description="Bill numbers run in order and start again from 0001 each financial year, in April.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice prefix" hint={`Your next bill will be numbered like ${s.invoicePrefix || "INV"}/26-27/0001`}>
            <Input maxLength={5} className="uppercase" value={s.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
          </Field>
          <Field label="Default template">
            <Select value={s.defaultTemplate} onChange={(e) => set("defaultTemplate", e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="UPI ID" hint="Adds a scan-to-pay QR code with the bill amount filled in." error={errors.upiId}>
            <Input value={s.upiId} aria-invalid={!!errors.upiId} onChange={(e) => set("upiId", e.target.value.trim())} placeholder="cafe@okhdfcbank" />
          </Field>
          <Field label="Brand colour" hint="Used by the Modern template.">
            <div className="flex gap-2">
              <input type="color" aria-label="Brand colour" value={s.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" />
              <Input value={s.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="num" maxLength={7} />
            </div>
          </Field>
          <Field label="Footer note" className="sm:col-span-2">
            <Textarea rows={2} value={s.footerNote} onChange={(e) => set("footerNote", e.target.value)} />
          </Field>
        </div>
      </Section>

      <div className="chrome sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-end gap-4 border-t border-line py-3 lg:bottom-0">
        {saved && (
          <span role="status" className="flex items-center gap-1.5 font-[560] text-good">
            <IconCheck className="size-4" /> Saved
          </span>
        )}
        {Object.keys(errors).length > 0 && <span className="text-bad">Some fields need fixing. They&apos;re marked in red.</span>}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : welcome ? "Save and add your menu" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/** Ledger-page section: heading and explanation in the margin, fields on the right. */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-12 gap-y-4 border-t-2 border-rule py-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <h2 className="title">{title}</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-2">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
