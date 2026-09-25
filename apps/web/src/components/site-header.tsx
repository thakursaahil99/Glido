"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, MapPin, Search, ShoppingCart, UtensilsCrossed, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import type { WalletSummary } from "@/lib/types";
import { GlidoLogo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

const NAV_LINKS: { href: string; label: string; icon: LucideIcon; color: string }[] = [
  { href: "/food", label: "Food", icon: UtensilsCrossed, color: "var(--glido-food)" },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart, color: "var(--glido-grocery)" },
  { href: "/cab", label: "Cab", icon: Car, color: "var(--glido-cab)" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      return;
    }
    api.get<WalletSummary>("/wallet/me").then(setWallet).catch(() => undefined);
  }, [user]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/food${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <header
      className={`sticky top-0 z-40 bg-[var(--glido-surface)]/90 backdrop-blur-xl transition-shadow ${scrolled ? "shadow-[var(--shadow-lg)]" : "shadow-[0_1px_8px_rgba(0,0,0,0.04)]"}`}
    >
      {/* Top row: brand + location, search, wallet/cart/account */}
      <div className="container-glido flex h-[4.5rem] items-center gap-3 md:gap-5">
        <Link href="/" className="shrink-0">
          <GlidoLogo className="text-2xl" />
        </Link>

        <button
          type="button"
          className="hidden lg:flex items-center gap-1.5 text-sm shrink-0 pl-3 pr-3.5 py-2 rounded-full border border-[var(--glido-border)] hover:border-[var(--glido-primary)] transition-colors"
        >
          <MapPin size={15} className="text-[var(--glido-primary)]" />
          <span className="font-semibold text-[var(--glido-ink)]">Mumbai</span>
          <span className="text-[var(--glido-muted)] text-xs">▾</span>
        </button>

        <form onSubmit={onSearchSubmit} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--glido-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants, dishes, stores..."
              className="w-full rounded-full border border-[var(--glido-border)] bg-[var(--glido-bg)] pl-10 pr-4 py-2.5 text-sm focus:outline-2 focus:outline-[var(--glido-primary)] focus:bg-[var(--glido-surface)] transition-colors"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          {user && (
            <Link
              href="/wallet"
              className="hidden sm:flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 transition-transform shrink-0"
              style={{ background: "linear-gradient(120deg, #ff8a00, var(--glido-primary) 60%, var(--glido-accent))" }}
            >
              <Wallet size={15} />
              {wallet ? `₹${wallet.balance.toFixed(0)}` : "—"}
            </Link>
          )}
          <Link href="/cart" className="btn-secondary relative text-sm !py-2 !px-3 shrink-0">
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--glido-accent)] text-white text-[11px] font-bold ring-2 ring-[var(--glido-surface)]">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <NotificationBell />
              <Link href="/profile" className="btn-primary text-sm !py-2 !px-3 shrink-0">
                {user.name?.split(" ")[0] ?? "Account"}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm !py-2 !px-3 shrink-0">
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Bottom strip: module nav, always visible so the header never looks thin/empty */}
      <div className="border-t border-[var(--glido-border)] bg-[var(--glido-bg)]/60">
        <div className="container-glido flex items-center gap-2 h-11 overflow-x-auto">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0"
                style={
                  active
                    ? { background: link.color, color: "white", boxShadow: "0 4px 10px -3px rgba(0,0,0,0.3)" }
                    : { color: "var(--glido-muted)" }
                }
              >
                <Icon size={13} />
                {link.label}
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-[var(--glido-border)]" />
          <Link href="/partner-with-us" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--glido-muted)] hover:text-[var(--glido-primary)] shrink-0">
            Partner with us
          </Link>
          <Link href="/become-a-delivery-partner" className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[var(--glido-muted)] hover:text-[var(--glido-primary)] shrink-0">
            Ride with us
          </Link>
        </div>
      </div>
    </header>
  );
}
