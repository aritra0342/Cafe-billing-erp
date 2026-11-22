import { Logo } from "@/components/logo";
import { InvoicePaper } from "@/components/invoice-templates";
import { sampleInvoice } from "@/lib/sample-invoice";

// A fixed time keeps this page static; the receipt is a demo, not a live bill.
const DEMO = sampleInvoice({}, new Date("2026-11-05T09:42:00+05:30"));

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="relative hidden h-dvh overflow-hidden border-r border-line px-12 pt-10 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <Logo />
        <div className="mt-16 max-w-[34rem]">
          <h1 className="text-[4.5rem] leading-[0.92] font-[760] [font-stretch:75%]">Ring up the chai. Print the GST bill. Next customer.</h1>
          <p className="lede mt-6">
            Billing for Indian cafés. Your menu with sizes and add-ons, a counter screen built for the morning rush, and bills with CGST and SGST that print on A4 or a thermal roll.
          </p>
        </div>
        {/* The product itself: a real receipt from the 80mm template, coming up from the counter edge.
            It sits below the text in normal flow, so it can never cover the copy, and the panel clips it. */}
        <div aria-hidden className="relative mt-12 min-h-[18rem] flex-1">
          <div className="till pointer-events-none absolute top-0 right-0 rotate-[3deg] select-none xl:right-8">
            <InvoicePaper templateId="thermal80" doc={DEMO} />
          </div>
        </div>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 px-5 py-12">
        <div className="text-center lg:hidden">
          <Logo />
          <p className="mt-2 text-ink-2">GST billing for Indian cafés</p>
        </div>
        {children}
      </section>
    </main>
  );
}
