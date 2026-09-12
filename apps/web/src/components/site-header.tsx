"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import type { WalletSummary } from "@/lib/types";
import { GlidoLogo } from "./logo";
import { NotificationBell } from "./notification-bell";

const NAV_LINKS = [
  { href: "/food", label: "Food" },
  { href: "/grocery", label: "Grocery" },
  { href: "/cab", label: "Cab" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

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

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow ${
        scrolled ? "border-transparent shadow-[var(--shadow-md)]" : "border-[var(--glido-border)]"
      }`}
    >
      <div className="container-glido flex h-16 items-center justify-between gap-4">
        <Link href="/">
          <GlidoLogo className="text-xl" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname?.startsWith(link.href)
                  ? "bg-[var(--glido-primary-light)] text-[var(--glido-primary-dark)]"
                  : "text-[var(--glido-muted)] hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/wallet"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[var(--glido-border)] px-3 py-2 text-sm font-semibold text-[var(--glido-ink)] hover:border-[var(--glido-primary)] hover:bg-[var(--glido-primary-light)] transition-colors"
            >
              <Wallet size={15} className="text-[var(--glido-primary)]" />
              {wallet ? `₹${wallet.balance.toFixed(0)}` : "—"}
            </Link>
          )}
          <Link href="/cart" className="btn-secondary relative text-sm !py-2 !px-3">
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--glido-accent)] text-white text-[11px] font-bold">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <NotificationBell />
              <Link href="/profile" className="btn-primary text-sm !py-2 !px-3">
                {user.name?.split(" ")[0] ?? "Account"}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm !py-2 !px-3">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
