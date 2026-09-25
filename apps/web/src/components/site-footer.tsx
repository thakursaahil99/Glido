import Link from "next/link";
import { APP_DOWNLOADS } from "@/lib/app-downloads";
import { GlidoLogo } from "./logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
      { href: "/help-center", label: "Help Center" },
    ],
  },
  {
    title: "Get the App",
    links: [
      { href: APP_DOWNLOADS.customer, label: "Customer App (Android)" },
      { href: APP_DOWNLOADS.delivery, label: "Delivery Partner App" },
      { href: APP_DOWNLOADS.restaurantPartner, label: "Restaurant Partner App" },
    ],
  },
  {
    title: "Partner with Glido",
    links: [
      { href: "/partner-with-us", label: "Become a Restaurant Partner" },
      { href: "/become-a-delivery-partner", label: "Become a Delivery Partner" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund & Cancellation" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)]">
      <div className="container-glido py-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <GlidoLogo className="text-lg" />
          <p className="mt-3 text-sm text-[var(--glido-muted)]">
            Food, groceries and rides — glide through your day.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-[var(--glido-ink)] mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) =>
                link.href.startsWith("/downloads/") ? (
                  <li key={link.href}>
                    <a href={link.href} className="text-sm text-[var(--glido-muted)] hover:text-[var(--glido-primary)]">
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-[var(--glido-muted)] hover:text-[var(--glido-primary)]">
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--glido-border)] py-4">
        <p className="container-glido text-xs text-[var(--glido-muted)]">
          © {new Date().getFullYear()} Glido. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
