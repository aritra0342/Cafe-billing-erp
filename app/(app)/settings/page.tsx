import { Suspense } from "react";
import { DEFAULT_SETTINGS, getLogo, getSettings } from "@/lib/data";
import { SettingsForm } from "@/components/settings-form";
import { PageHeader, Skeleton } from "@/components/ui";

export const metadata = { title: "Settings" };

export default function Page({ searchParams }: PageProps<"/settings">) {
  return (
    <>
      <PageHeader title="Café details" description="Changes apply to new bills. Bills already issued keep the details they were printed with." />
      <Suspense fallback={<Skeleton className="h-[60vh] max-w-3xl" />}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Settings({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  const [settings, logo, sp] = await Promise.all([getSettings(), getLogo(), searchParams]);
  return <SettingsForm initial={settings ?? DEFAULT_SETTINGS} logo={logo} canSetLogo={!!settings} welcome={!settings || sp.welcome === "1"} />;
}
