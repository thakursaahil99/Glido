"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, ShoppingBasket, UtensilsCrossed } from "lucide-react";

const ITEMS = [
  { href: "/food", label: "Food", icon: UtensilsCrossed, color: "var(--glido-food)", glow: "rgba(255,75,38,0.32)" },
  { href: "/grocery", label: "Grocery", icon: ShoppingBasket, color: "var(--glido-grocery)", glow: "rgba(0,184,115,0.32)" },
  { href: "/cab", label: "Cab", icon: Car, color: "var(--glido-cab)", glow: "rgba(62,82,255,0.32)" },
];

/** The "Tri-Service Vertical Switcher" — signature component of the Glido design system:
 * a segmented 3-column pill array. The active vertical gets a solid gradient fill,
 * white text/icon, and a color-matched glow; idle items sit flat on a muted pill. */
export function TriServiceSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-full ${className}`} style={{ background: "var(--glido-border)" }}>
      {ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold transition-all"
            style={
              active
                ? { background: item.color, color: "white", boxShadow: `0 8px 20px -4px ${item.glow}`, transform: "scale(1.02)" }
                : { color: "var(--glido-muted)" }
            }
          >
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
