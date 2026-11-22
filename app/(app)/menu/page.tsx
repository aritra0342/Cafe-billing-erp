import { Suspense } from "react";
import { getMenu } from "@/lib/data";
import { MenuEditor } from "@/components/menu-editor";
import { MenuSheet } from "@/components/menu-sheet";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata = { title: "Menu" };

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Menu card" description="The counter bills from these prices. Changing a price affects new bills only; bills already issued keep what was charged." />
      <Suspense
        fallback={
          <div className="grid gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        }
      >
        <Menu />
      </Suspense>
    </div>
  );
}

async function Menu() {
  const { categories, items } = await getMenu();
  return (
    <>
      <MenuSheet hasItems={items.length > 0} />
      <MenuEditor categories={categories} items={items} />
    </>
  );
}
