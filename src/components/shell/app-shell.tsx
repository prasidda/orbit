"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useQuery } from "convex/react";
import { Home, Users, Settings, Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { TOOLS } from "@/tools/registry";
import { Brand, BrandMark } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { CommandPalette, useCommandPalette } from "@/components/shell/command-palette";
import { cn } from "@/lib/utils";

type NavItem = {
  href: Route;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent?: string;
};

/** Nav is derived from the registry, so a new tool appears everywhere at once. */
const primaryNav: NavItem[] = [
  { href: "/" as Route, label: "Today", icon: Home },
  ...TOOLS.map((t) => ({ href: t.href, label: t.label, icon: t.icon, accent: t.accent })),
  { href: "/friends" as Route, label: "Friends", icon: Users },
];

/** Phones get five; Friends and Settings live behind the avatar. */
const mobileNav: NavItem[] = [
  { href: "/" as Route, label: "Today", icon: Home },
  ...TOOLS.map((t) => ({ href: t.href, label: t.label, icon: t.icon, accent: t.accent })),
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function SideRail() {
  const isActive = useIsActive();
  const me = useQuery(api.users.me);
  const friends = useQuery(api.friends.list);
  const palette = useCommandPalette();
  const pendingCount = friends?.incoming.length ?? 0;

  return (
    <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-line bg-rail px-3 py-5 lg:flex">
      <div className="space-y-6">
        <Link href={"/" as Route} className="block px-2">
          <Brand />
        </Link>

        <nav className="space-y-1">
          {primaryNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(43_38_34/0.05)]"
                    : "text-ink-muted hover:bg-[color:var(--surface)]/60 hover:text-ink"
                )}
              >
                <item.icon
                  className="size-4 shrink-0"
                  style={active && item.accent ? { color: item.accent } : undefined}
                />
                <span className="flex-1">{item.label}</span>
                {item.label === "Friends" && pendingCount > 0 ? (
                  <span className="grid size-5 place-items-center rounded-full bg-terracotta text-[0.625rem] font-bold text-white">
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2">
        <Link
          href={"/settings" as Route}
          className={cn(
            "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors",
            isActive("/settings")
              ? "bg-surface font-semibold text-ink"
              : "text-ink-muted hover:text-ink"
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>

        <button
          type="button"
          onClick={palette.open}
          className="flex w-full items-center gap-2.5 rounded-full border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-line-strong"
        >
          <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-sage text-[0.625rem] font-bold uppercase text-white">
            {me?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              me?.name?.slice(0, 2) ?? "··"
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold leading-tight">
              {me?.name ?? "Loading"}
            </span>
            <span className="block truncate text-[0.6875rem] leading-tight text-ink-faint">
              @{me?.handle ?? "…"}
            </span>
          </span>
          <kbd className="rounded-md bg-surface-sunk px-1.5 py-0.5 text-[0.625rem] font-semibold text-ink-faint">
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const palette = useCommandPalette();
  return (
    <header className="safe-top sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-[color:var(--ground)]/85 px-4 py-3 backdrop-blur-md lg:hidden">
      <Link href={"/" as Route} className="flex items-center gap-2">
        <BrandMark />
        <span className="font-display text-xl leading-none">orbit</span>
      </Link>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={palette.open}
          aria-label="Search"
          className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Search className="size-4" />
        </button>
        <ThemeToggle />
        <Link
          href={"/settings" as Route}
          aria-label="Settings"
          className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Settings className="size-4" />
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const isActive = useIsActive();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-line bg-[color:var(--ground)]/90 px-2 pt-1.5 backdrop-blur-md lg:hidden">
      {mobileNav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5"
          >
            <span
              className={cn(
                "grid h-7 w-12 place-items-center rounded-full transition-colors",
                active ? "bg-terracotta-soft" : "bg-transparent"
              )}
            >
              <item.icon
                className={cn("size-[1.125rem]", active ? "" : "text-ink-faint")}
                style={active ? { color: item.accent ?? "var(--terracotta)" } : undefined}
              />
            </span>
            <span
              className={cn(
                "truncate text-[0.625rem] leading-none",
                active ? "font-semibold text-ink" : "text-ink-faint"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-ground">
      <SideRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
