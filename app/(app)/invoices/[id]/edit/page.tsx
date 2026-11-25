import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getInvoice, getMenu, getSettings, linesRevision } from "@/lib/data";
import { paidByLabel } from "@/lib/billing";
import { BillingCounter } from "@/components/billing-counter";
import { ButtonLink, EmptyState, Skeleton } from "@/components/ui";

export const metadata = { title: "Edit bill" };

export default function Page({ params }: PageProps<"/invoices/[id]/edit">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-10 lg:grid-cols-[1fr_23rem]">
          <div className="grid content-start gap-3">
            <Skeleton className="h-12" />
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
          <Skeleton className="h-[28rem]" />
        </div>
      }
    >
      <EditBill params={params} />
    </Suspense>
  );
}

async function EditBill({ params }: Pick<PageProps<"/invoices/[id]/edit">, "params">) {
  const { id } = await params;
  const [bill, settings, menu] = await Promise.all([getInvoice(id), getSettings(), getMenu()]);
  if (!bill) notFound();
  if (!settings)
    return (
      <EmptyState title="Add your café details first" action={<ButtonLink href="/settings?welcome=1" variant="primary">Add café details</ButtonLink>}>
        Bills are edited from the counter, which needs your café&apos;s details.
      </EmptyState>
    );
  return (
    <>
      <h1 className="mb-6 text-[1.75rem] leading-tight font-[720] [font-stretch:78%]">
        Edit bill <span className="num">{bill.number}</span>
      </h1>
      <BillingCounter
        categories={menu.categories}
        items={menu.items}
        // An edited bill is re-totalled at the tax rate it was issued with, not today's settings.
        config={{ cafeName: settings.cafeName, taxMode: bill.taxMode, gstRate: bill.gstRate, pricesIncludeTax: bill.pricesIncludeTax, defaultTemplate: bill.templateId }}
        editing={{
          id: bill.id,
          number: bill.number,
          status: bill.status,
          paymentMode: bill.paymentMode,
          paidBy: paidByLabel(bill),
          lines: bill.lines,
          customerName: bill.customerName,
          customerPhone: bill.customerPhone,
          customerGstin: bill.customerGstin,
          customerAddress: bill.customerAddress,
          orderType: bill.orderType,
          tableNo: bill.tableNo,
          discountType: bill.discountType,
          discountValue: bill.discountValue,
          notes: bill.notes,
          revision: linesRevision(bill.lines),
        }}
      />
    </>
  );
}
