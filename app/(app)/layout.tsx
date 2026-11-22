import { Suspense } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { TabBar, TabBarLinks, TopNav, TopNavLinks } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh print:block">
      <header className="no-print chrome sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-6 px-4 sm:px-6 lg:h-16 lg:px-8">
          <Link href="/" aria-label="Chai & Change, today" className="shrink-0">
            <Logo />
          </Link>
          <div className="hidden flex-1 self-stretch lg:flex">
            <Suspense fallback={<TopNavLinks pathname={null} />}>
              <TopNav />
            </Suspense>
          </div>
          <div className="ml-auto flex items-center">
            <Suspense fallback={<div className="skeleton size-7 rounded-full" />}>
              <UserButton />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[90rem] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-10 lg:pb-16 print:max-w-none print:p-0">{children}</main>

      {/* Phone tab bar: translucent, content scrolls beneath */}
      <footer className="no-print chrome fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
        <Suspense fallback={<TabBarLinks pathname={null} />}>
          <TabBar />
        </Suspense>
      </footer>
    </div>
  );
}
