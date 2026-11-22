"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCounter, IconInvoices, IconMenu, IconSettings, IconToday } from "./icons";

export const NAV = [
  { href: "/", label: "Today", icon: IconToday },
  { href: "/invoices/new", label: "Counter", icon: IconCounter },
  { href: "/invoices", label: "Bills", icon: IconInvoices },
  { href: "/menu", label: "Menu", icon: IconMenu },
  { href: "/templates", label: "Templates", icon: null },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/invoices") return pathname === "/invoices" || (pathname.startsWith("/invoices/") && pathname !== "/invoices/new");
  return pathname === href || pathname.startsWith(href + "/");
}

/** Pure list; `pathname` is null in the prerendered fallback before the URL resolves. */
export function TopNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex items-stretch gap-1 self-stretch">
      {NAV.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center px-3 text-[1rem] font-[560] transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full ${active ? "text-ink after:bg-accent" : "text-ink-2 after:bg-transparent hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBarLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="grid grid-cols-5">
      {NAV.filter((n) => n.icon).map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`press flex flex-col items-center gap-0.5 py-2 text-[0.75rem] font-[560] ${active ? "text-accent" : "text-ink-2"}`}>
            {Icon && <Icon className="size-6" />}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TopNav() {
  return <TopNavLinks pathname={usePathname()} />;
}
export function TabBar() {
  return <TabBarLinks pathname={usePathname()} />;
}
