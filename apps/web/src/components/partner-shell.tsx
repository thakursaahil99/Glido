"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, Package, UtensilsCrossed, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GlidoLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/partner", label: "Restaurant", icon: LayoutDashboard },
  { href: "/partner/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/partner/orders", label: "Orders", icon: Package },
];

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 py-3 overflow-y-auto">
      {NAV.map((item) => {
        const active = item.href === "/partner" ? pathname === "/partner" : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 mx-3 my-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--glido-primary-light)] text-[var(--glido-primary-dark)]"
                : "text-[var(--glido-muted)] hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)] hover:text-[var(--glido-ink)]"
            }`}
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/partner/login") return <>{children}</>;
  return <PartnerGuard>{children}</PartnerGuard>;
}

function PartnerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "RESTAURANT_OWNER") {
      router.push(`/partner/login?redirect=${encodeURIComponent(pathname ?? "/partner")}`);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user || user.role !== "RESTAURANT_OWNER") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--glido-muted)]">
        Checking partner access...
      </div>
    );
  }

  async function onLogout() {
    await logout();
    router.push("/partner/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)] hidden md:flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-[var(--glido-border)]">
          <Link href="/partner">
            <GlidoLogo className="text-lg" />
          </Link>
        </div>
        <p className="px-5 pt-3 text-xs text-[var(--glido-muted)]">Partner Portal</p>
        <NavLinks pathname={pathname} />
        <div className="p-4 border-t border-[var(--glido-border)] space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[var(--glido-primary-light)] flex items-center justify-center text-[var(--glido-primary-dark)] font-semibold text-xs shrink-0">
              {(user.name ?? user.email ?? "P").charAt(0).toUpperCase()}
            </div>
            <div className="text-xs min-w-0">
              <p className="font-medium text-[var(--glido-ink)] truncate">{user.name ?? user.email}</p>
              <p className="text-[var(--glido-muted)] truncate">Restaurant Partner</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-[var(--glido-danger)] font-medium">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="hidden md:flex h-14 items-center justify-end gap-2 px-6 border-b border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)] sticky top-0 z-30">
          <ThemeToggle />
          <NotificationBell />
        </header>

        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)] sticky top-0 z-40">
          <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="text-[var(--glido-ink)]">
            <Menu size={22} />
          </button>
          <GlidoLogo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <button onClick={onLogout} className="text-xs text-[var(--glido-danger)] font-medium">
              Log out
            </button>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="w-72 bg-white dark:bg-[var(--glido-surface)] h-full flex flex-col shadow-xl">
              <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--glido-border)]">
                <GlidoLogo />
                <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                  <X size={20} />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <button
              aria-label="Close menu overlay"
              onClick={() => setMobileNavOpen(false)}
              className="flex-1 bg-black/40"
            />
          </div>
        )}

        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
