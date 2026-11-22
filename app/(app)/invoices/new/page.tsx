import { Suspense } from "react";
import { getMenu, getSettings } from "@/lib/data";
import { BillingCounter } from "@/components/billing-counter";
import { ButtonLink, EmptyState, Skeleton } from "@/components/ui";

export const metadata = { title: "Counter" };

export default function Page() {
  return (
    <>
      <h1 className="sr-only">Counter: new bill</h1>
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
        <Counter />
      </Suspense>
    </>
  );
}

async function Counter() {
  const [settings, menu] = await Promise.all([getSettings(), getMenu()]);
  if (!settings)
    return (
      <EmptyState title="Add your café details first" action={<ButtonLink href="/settings?welcome=1" variant="primary">Add café details</ButtonLink>}>
        A GST bill needs your café&apos;s name, address and GSTIN at the top. It takes about a minute.
      </EmptyState>
    );
  if (menu.items.length === 0)
    return (
      <EmptyState title="The counter bills from your menu" action={<ButtonLink href="/menu" variant="primary">Add your menu</ButtonLink>}>
        Add a few items with their prices, or start from the sample café menu and edit it.
      </EmptyState>
    );
  return (
    <BillingCounter
      categories={menu.categories}
      items={menu.items}
      config={{ cafeName: settings.cafeName, taxMode: settings.taxMode, gstRate: settings.gstRate, pricesIncludeTax: settings.pricesIncludeTax, defaultTemplate: settings.defaultTemplate }}
    />
  );
}
