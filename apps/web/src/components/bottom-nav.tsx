"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Home, LogIn, ShoppingCart, User, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/food", label: "Food", icon: UtensilsCrossed },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/cab", label: "Cab", icon: Car },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastItem = user
    ? { href: "/profile", label: "Profile", icon: User }
    : { href: "/login", label: "Login", icon: LogIn };
  const items = [...ITEMS, lastItem];

  return (
    <nav className="md:hidden sticky bottom-0 z-40 border-t border-[var(--glido-border)] bg-white">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-[var(--glido-primary)]" : "text-[var(--glido-muted)]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
