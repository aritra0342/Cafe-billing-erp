"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { usePathname } from "next/navigation";
import { IconCounter, IconExpenses, IconInvoices, IconMore, IconToday } from "./icons";

/** `tab` puts the page on the phone's tab bar; the rest sit behind its More button. */
export const NAV = [
  { href: "/", label: "Today", icon: IconToday, tab: true },
  { href: "/invoices/new", label: "Counter", icon: IconCounter, tab: true },
  { href: "/invoices", label: "Bills", icon: IconInvoices, tab: true },
  { href: "/expenses", label: "Expenses", icon: IconExpenses, tab: true },
  { href: "/reports", label: "Reports", icon: null, tab: false },
  { href: "/menu", label: "Menu", icon: null, tab: false },
  { href: "/templates", label: "Templates", icon: null, tab: false },
  { href: "/settings", label: "Settings", icon: null, tab: false },
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
    <nav aria-label="Main" className="flex items-stretch gap-0.5 self-stretch xl:gap-1">
      {NAV.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center px-2.5 text-[1rem] font-[560] transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-t-full xl:px-3 xl:after:inset-x-3 ${active ? "text-ink after:bg-accent" : "text-ink-2 after:bg-transparent hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const tabClass = (active: boolean) => `press flex flex-col items-center gap-0.5 py-2 text-[0.75rem] font-[560] ${active ? "text-accent" : "text-ink-2"}`;

export function TabBarLinks({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const more = useRef<HTMLDivElement>(null);
  const rest = NAV.filter((n) => !n.tab);
  const inMore = rest.some((n) => isActive(pathname, n.href));

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!more.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <nav aria-label="Main" className="grid grid-cols-5">
      {NAV.filter((n) => n.tab).map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
            {Icon && <Icon className="size-6" />}
            {label}
          </Link>
        );
      })}
      <div ref={more} className="relative grid">
        <button type="button" aria-expanded={open} aria-controls="more-pages" onClick={() => setOpen((v) => !v)} className={tabClass(inMore || open)}>
          <IconMore className="size-6" />
          More
        </button>
        {open && (
          <ul id="more-pages" className="more-pop absolute right-2 bottom-[calc(100%+0.5rem)] grid w-52 origin-bottom-right gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.28)]">
            {rest.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={`press flex h-12 items-center rounded-lg px-3.5 text-[1.0625rem] font-[560] ${active ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-surface-2"}`}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}

export function TopNav() {
  return <TopNavLinks pathname={usePathname()} />;
}
export function TabBar() {
  return <TabBarLinks pathname={usePathname()} />;
}
