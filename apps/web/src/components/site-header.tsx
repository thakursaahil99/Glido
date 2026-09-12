"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--glido-border)] bg-white/95 backdrop-blur">
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
