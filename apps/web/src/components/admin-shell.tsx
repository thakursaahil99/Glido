"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bike,
  Car,
  Clock3,
  Contact,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { Permission } from "@glido/shared";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { GlidoLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

const NAV: { href: string; label: string; icon: LucideIcon; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "view_reports" },
  { href: "/admin/restaurants", label: "Restaurants", icon: UtensilsCrossed, permission: "manage_restaurants" },
  { href: "/admin/orders/all", label: "All Orders", icon: Package, permission: "manage_orders" },
  { href: "/admin/orders", label: "Food Orders", icon: Package, permission: "manage_orders" },
  { href: "/admin/grocery/categories", label: "Grocery Categories", icon: ShoppingCart, permission: "manage_grocery" },
  { href: "/admin/grocery/products", label: "Grocery Products", icon: ShoppingCart, permission: "manage_grocery" },
  { href: "/admin/grocery/orders", label: "Grocery Orders", icon: Package, permission: "manage_grocery" },
  { href: "/admin/delivery-partners", label: "Delivery Partners", icon: Truck, permission: "manage_drivers" },
  { href: "/admin/cab/ride-types", label: "Cab Ride Types", icon: Car, permission: "manage_rides" },
  { href: "/admin/cab/drivers", label: "Cab Drivers", icon: Bike, permission: "manage_drivers" },
  { href: "/admin/cab/rides", label: "Cab Rides", icon: Map, permission: "manage_rides" },
  { href: "/admin/users", label: "Users", icon: Users, permission: "manage_users" },
  { href: "/admin/support", label: "Support Chat", icon: MessageCircle, permission: "manage_support" },
  { href: "/admin/coupons", label: "Coupons", icon: Tags, permission: "manage_coupons" },
  { href: "/admin/banners", label: "Banners (CMS)", icon: ImageIcon, permission: "manage_banners" },
  { href: "/admin/cities", label: "Cities & Zones", icon: MapPin, permission: "manage_settings" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "manage_settings" },
  { href: "/admin/staff", label: "Staff", icon: UserCog, permission: "manage_staff" },
  { href: "/admin/audit-log", label: "Audit Log", icon: Clock3, permission: "manage_staff" },
];

function NavLinks({
  visibleNav,
  pathname,
  onNavigate,
}: {
  visibleNav: typeof NAV;
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 py-3 overflow-y-auto">
      {visibleNav.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return <>{children}</>;

  return <AdminGuard>{children}</AdminGuard>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "ADMIN") {
      router.push(`/admin/login?redirect=${encodeURIComponent(pathname ?? "/admin")}`);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--glido-muted)]">
        Checking admin access...
      </div>
    );
  }

  const visibleNav = NAV.filter((item) => hasPermission(user, item.permission));

  async function onLogout() {
    await logout();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)] hidden md:flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-[var(--glido-border)]">
          <Link href="/admin">
            <GlidoLogo className="text-lg" />
          </Link>
        </div>
        <NavLinks visibleNav={visibleNav} pathname={pathname} />
        <div className="p-4 border-t border-[var(--glido-border)] space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[var(--glido-primary-light)] flex items-center justify-center text-[var(--glido-primary-dark)] font-semibold text-xs shrink-0">
              {(user.name ?? user.email ?? "A").charAt(0).toUpperCase()}
            </div>
            <div className="text-xs min-w-0">
              <p className="font-medium text-[var(--glido-ink)] truncate">{user.name ?? user.email}</p>
              <p className="text-[var(--glido-muted)] truncate">{user.adminRole?.replace(/_/g, " ") ?? "Admin"}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-[var(--glido-danger)] font-medium">
            <LogOut size={13} /> Log out
          </button>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-[var(--glido-muted)] hover:text-[var(--glido-primary)]">
            <Contact size={13} /> Back to Glido site
          </Link>
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
              <NavLinks visibleNav={visibleNav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
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
