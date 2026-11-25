import { Suspense } from "react";
import Link from "@/components/link";
import Form from "next/form";
import { INVOICES_PAGE_SIZE, listInvoices, summarizeInvoices, type BillFilter } from "@/lib/data";
import { formatDate, formatINR, formatTime, istDateKey, istDayStart, paidByLabel, parseYmd } from "@/lib/billing";
import { Button, ButtonLink, EmptyState, Input, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { Ledger } from "@/components/ledger";
import { IconDownload, IconPlus, IconSearch } from "@/components/icons";

export const metadata = { title: "Bills" };

export default function Page({ searchParams }: PageProps<"/invoices">) {
  return (
    <>
      <PageHeader
        title="Bills"
        description="Every invoice you've issued, newest first. Open one to reprint it, change its layout or send it on WhatsApp."
        actions={
          <ButtonLink href="/invoices/new" variant="primary">
            <IconPlus className="size-4" /> New bill
          </ButtonLink>
        }
      />
      <Suspense fallback={<Skeleton className="h-[50vh] w-full" />}>
        <InvoiceList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Ready-made ranges in IST. Each is a plain link, so the range is in the URL and survives a reload. */
function presets(): { label: string; from: string; to: string }[] {
  const today = istDateKey();
  const [y, m] = today.split("-").map(Number);
  const monthStart = today.slice(0, 8) + "01";
  const lastMonthEnd = istDateKey(new Date(istDayStart(monthStart, -1)));
  const fyStart = `${m >= 4 ? y : y - 1}-04-01`;
  return [
    { label: "Today", from: today, to: today },
    { label: "This month", from: monthStart, to: today },
    { label: "Last month", from: lastMonthEnd.slice(0, 8) + "01", to: lastMonthEnd },
    { label: "This financial year", from: fyStart, to: today },
  ];
}

const query = (f: BillFilter & { page?: number }) =>
  new URLSearchParams({
    ...(f.q ? { q: f.q } : {}),
    ...(f.from ? { from: f.from } : {}),
    ...(f.to ? { to: f.to } : {}),
    ...(f.page && f.page > 1 ? { page: String(f.page) } : {}),
  }).toString();

const rangeLabel = (from: string, to: string) => {
  const d = (ymd: string) => formatDate(istDayStart(ymd));
  if (from && to) return from === to ? `on ${d(from)}` : `from ${d(from)} to ${d(to)}`;
  return from ? `since ${d(from)}` : `up to ${d(to)}`;
};

async function InvoiceList({ searchParams }: Pick<PageProps<"/invoices">, "searchParams">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  let from = parseYmd(sp.from);
  let to = parseYmd(sp.to);
  if (from && to && from > to) [from, to] = [to, from];
  const filter = { q, from, to };
  const dated = Boolean(from || to);
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ invoices, total }, summary] = await Promise.all([listInvoices({ ...filter, page }), dated ? summarizeInvoices(filter) : null]);
  const pages = Math.max(1, Math.ceil(total / INVOICES_PAGE_SIZE));
  const href = (p: number) => `/invoices?${query({ ...filter, page: p })}`;
  const filtered = Boolean(q || dated);

  return (
    <div className="grid gap-5">
      <Form action="/invoices" className="grid gap-3 sm:grid-cols-[minmax(0,22rem)_auto_auto_auto] sm:items-end">
        <label className="grid gap-1.5">
          <span className="label">Search</span>
          <span className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input type="search" name="q" defaultValue={q} placeholder="Bill number, guest name or phone" className="pl-9" />
          </span>
        </label>
        <label className="grid gap-1.5">
          <span className="label">From</span>
          <Input type="date" name="from" defaultValue={from} max={istDateKey()} className="num" />
        </label>
        <label className="grid gap-1.5">
          <span className="label">To</span>
          <Input type="date" name="to" defaultValue={to} max={istDateKey()} className="num" />
        </label>
        <Button type="submit">Show bills</Button>
      </Form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Date ranges" className="flex flex-wrap items-center gap-1">
          {presets().map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link
                key={p.label}
                href={`/invoices?${query({ q, from: p.from, to: p.to })}`}
                aria-current={active ? "true" : undefined}
                className={`press rounded-md px-3 py-1.5 text-[0.9375rem] font-[560] ${active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
              >
                {p.label}
              </Link>
            );
          })}
          {filtered && (
            <Link href="/invoices" className="rounded-md px-3 py-1.5 text-[0.9375rem] font-[560] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
              Clear filters
            </Link>
          )}
        </nav>
        {total > 0 && (
          // A plain link: the browser downloads the file instead of navigating.
          <a href={`/invoices/export?${query(filter)}`} download className={buttonClass("secondary", "sm")}>
            <IconDownload className="size-4" /> Download CSV
          </a>
        )}
      </div>

      {summary && summary.count > 0 && (
        <p className="lede">
          <span className="money text-ink">{formatINR(summary.total)}</span> taken from {summary.count} {summary.count === 1 ? "bill" : "bills"} {rangeLabel(from, to)}
          {summary.gst > 0 && <>, including {formatINR(summary.gst)} GST</>}.
        </p>
      )}

      {invoices.length === 0 ? (
        filtered ? (
          <p className="py-10 text-ink-2">
            {q ? <>No bills match “{q}”{dated ? ` ${rangeLabel(from, to)}` : ""}. Try part of the number, like <span className="num">0042</span>, or the guest&apos;s phone number.</> : <>No bills {rangeLabel(from, to)}. Pick a wider range, or clear the filters to see every bill.</>}
          </p>
        ) : (
          <EmptyState title="No bills yet" action={<ButtonLink href="/invoices/new" variant="primary">Make the first bill</ButtonLink>}>
            Bills you save at the counter are kept here, ready to reprint or share.
          </EmptyState>
        )
      ) : (
        <Ledger
          whenLabel="Date"
          rows={invoices.map((inv) => ({
            id: inv.id,
            number: inv.number,
            when: `${formatDate(inv.issuedAt).replace(/ \d{4}$/, "")}, ${formatTime(inv.issuedAt)}`,
            guest: inv.customerName || (inv.tableNo ? `Table ${inv.tableNo}` : "Walk-in"),
            paidBy: paidByLabel(inv, false),
            status: inv.status,
            total: inv.total,
          }))}
        />
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-ink-2">
          <span>
            Page {page} of {pages}, {total} bills in all
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href(page - 1)} className={buttonClass("secondary", "sm")}>
                Newer bills
              </Link>
            )}
            {page < pages && (
              <Link href={href(page + 1)} className={buttonClass("secondary", "sm")}>
                Older bills
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
