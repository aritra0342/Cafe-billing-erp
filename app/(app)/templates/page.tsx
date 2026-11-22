import { Suspense } from "react";
import { getLogo, getSettings } from "@/lib/data";
import { setDefaultTemplate } from "@/lib/actions/settings";
import { upiQr } from "@/lib/qr";
import { sampleInvoice } from "@/lib/sample-invoice";
import { TEMPLATES } from "@/lib/templates";
import { InvoicePaper } from "@/components/invoice-templates";
import { Button, PageHeader, Skeleton } from "@/components/ui";
import { IconCheck } from "@/components/icons";

export const metadata = { title: "Templates" };

// Shrinks each paper size to fit its preview; the receipts are narrow, so they stay near life size.
const ZOOM: Record<string, number> = { A4: 0.46, A5: 0.64, "80mm": 0.92, "58mm": 1.05 };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Bill layouts"
        description="Six layouts: four based on bills Indian cafés already hand out, and two adapted from open-source invoice templates. Pick one per bill at the counter, or switch a saved bill to another before printing. Previews use your café's details."
      />
      <Suspense
        fallback={
          <div className="grid gap-10 md:grid-cols-2">
            {TEMPLATES.map((t) => (
              <Skeleton key={t.id} className="h-[30rem]" />
            ))}
          </div>
        }
      >
        <Gallery />
      </Suspense>
    </>
  );
}

async function Gallery() {
  const [settings, logo] = await Promise.all([getSettings(), getLogo()]);
  const sample = sampleInvoice(settings ?? {});
  const doc = { ...sample, business: { ...sample.business, logo } };
  const qr = await upiQr(doc);
  const current = settings?.defaultTemplate ?? "classic";

  return (
    <ul className="grid gap-x-10 gap-y-14 md:grid-cols-2">
      {TEMPLATES.map((t) => (
        <li key={t.id} className="grid content-start gap-5">
          <div aria-hidden className="relative h-[26rem] overflow-hidden rounded-xl bg-surface-2/70 px-6 pt-8 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
            <div className="pointer-events-none select-none" style={{ zoom: ZOOM[t.paper] }}>
              <InvoicePaper templateId={t.id} doc={{ ...doc, templateId: t.id }} qr={qr} />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[1.5rem] leading-tight font-[720] [font-stretch:78%]">{t.name}</h2>
              <span className="num shrink-0 text-ink-2">{t.paper === "80mm" || t.paper === "58mm" ? `${t.paper} roll` : `${t.paper} sheet`}</span>
            </div>
            <p className="max-w-[60ch] text-ink-2">{t.description}</p>
            <p className="text-[0.875rem] text-ink-3">
              Based on{" "}
              {t.source ? (
                <a href={t.source} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2 hover:text-ink">
                  {t.inspiredBy}
                </a>
              ) : (
                t.inspiredBy
              )}
              .
            </p>            <div className="mt-1">
              {current === t.id ? (
                <p className="flex h-11 items-center gap-1.5 font-[560] text-good">
                  <IconCheck className="size-4" /> Used for new bills by default
                </p>
              ) : settings ? (
                <form action={setDefaultTemplate.bind(null, t.id)}>
                  <Button type="submit">Use for new bills</Button>
                </form>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
