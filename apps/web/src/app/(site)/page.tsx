"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Car,
  Check,
  Clock,
  Download,
  Headset,
  MapPin,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { APP_DOWNLOADS } from "@/lib/app-downloads";
import type { Banner, Paginated, Restaurant } from "@/lib/types";
import { RestaurantCard, RestaurantCardSkeleton } from "@/components/restaurant-card";
import { ErrorState } from "@/components/empty-state";

const HOW_IT_WORKS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: MapPin, title: "Set your location", desc: "Tell us where you are so we can show what's nearby." },
  { icon: ShoppingBag, title: "Order what you need", desc: "Food, groceries or a ride — all in one place." },
  { icon: Rocket, title: "Track it live", desc: "Watch your order move from prep to your doorstep." },
];

const STATS: { value: string; label: string }[] = [
  { value: "3-in-1", label: "Food, grocery & cab in one app" },
  { value: "10-30 min", label: "Average delivery time" },
  { value: "100%", label: "Secure payments & wallet" },
  { value: "24/7", label: "Order anytime, anywhere" },
];

const WHY_GLIDO: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Clock, title: "Fast delivery", desc: "Live order tracking from the kitchen or store straight to your door." },
  { icon: Wallet, title: "Glido Wallet", desc: "Top up once, pay everywhere — plus referral bonuses and loyalty points." },
  { icon: ShieldCheck, title: "Secure by default", desc: "Encrypted accounts, verified restaurants and rated delivery partners." },
  { icon: Headset, title: "Always-on support", desc: "Live chat with our team right from the app whenever you need help." },
];

const APP_FEATURES = [
  "Live order & ride tracking on a map",
  "Glido Wallet with referral rewards",
  "One-tap reorder from your history",
];

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [restaurantsRes, bannersRes] = await Promise.all([
        api.get<Paginated<Restaurant>>("/restaurants?pageSize=6"),
        api.get<Banner[]>("/banners"),
      ]);
      setRestaurants(restaurantsRes.items);
      setBanners(bannersRes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the homepage. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/food${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--glido-primary-light)] to-transparent">
        <div className="container-glido py-12 md:py-16">
          <div className="flex items-center gap-1.5 text-sm text-[var(--glido-muted)] mb-3">
            <MapPin size={15} />
            <span className="font-medium text-[var(--glido-ink)]">Mumbai</span>
            <span className="text-xs">(tap to change — coming soon)</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[var(--glido-ink)] max-w-2xl">
            Food, groceries and rides.
            <br />
            <span className="text-[var(--glido-primary)]">One app. Everything local.</span>
          </h1>
          <form onSubmit={onSearchSubmit} className="mt-6 max-w-xl flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants or dishes..."
              className="input-glido"
            />
            <button type="submit" className="btn-primary shrink-0">
              Search
            </button>
          </form>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
            <Link href="/food" className="card-glido p-4 text-center hover:border-[var(--glido-primary)]">
              <UtensilsCrossed size={26} className="mx-auto mb-1.5 text-[var(--glido-primary)]" />
              <div className="text-sm font-semibold">Food</div>
            </Link>
            <Link href="/grocery" className="card-glido p-4 text-center hover:border-[var(--glido-primary)]">
              <ShoppingCart size={26} className="mx-auto mb-1.5 text-[var(--glido-primary)]" />
              <div className="text-sm font-semibold">Grocery</div>
            </Link>
            <Link href="/cab" className="card-glido p-4 text-center hover:border-[var(--glido-primary)]">
              <Car size={26} className="mx-auto mb-1.5 text-[var(--glido-primary)]" />
              <div className="text-sm font-semibold">Cab</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats / briefing bar */}
      <section className="border-y border-[var(--glido-border)] bg-white">
        <div className="container-glido py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <p className="text-2xl font-extrabold text-[var(--glido-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--glido-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Banners */}
      {banners.length > 0 && (
        <section className="container-glido py-6">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {banners.map((b) => (
              <Link
                key={b.id}
                href={b.link ?? "/food"}
                className="shrink-0 w-[280px] md:w-[360px] card-glido overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(b.imageUrl)} alt={b.title} className="h-32 w-full object-cover" />
                <div className="p-3 text-sm font-semibold">{b.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured restaurants */}
      <section className="container-glido py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--glido-ink)]">Popular restaurants near you</h2>
          <Link href="/food" className="flex items-center gap-1 text-sm font-medium text-[var(--glido-primary)]">
            See all <ArrowRight size={14} />
          </Link>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {!error && loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!error && !loading && restaurants && restaurants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </section>

      {/* Why Glido */}
      <section className="container-glido py-12">
        <h2 className="text-xl font-bold text-center mb-2">Why order on Glido?</h2>
        <p className="text-sm text-[var(--glido-muted)] text-center max-w-xl mx-auto mb-8">
          One account, one wallet, one app for everything you need delivered — built for speed and
          for staying in the loop from order to doorstep.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WHY_GLIDO.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-glido p-5">
                <div className="h-11 w-11 rounded-xl bg-[var(--glido-primary-light)] flex items-center justify-center mb-3">
                  <Icon size={20} className="text-[var(--glido-primary)]" />
                </div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-[var(--glido-muted)] mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Get the app */}
      <section className="container-glido py-10">
        <div className="card-glido p-6 md:p-10 bg-gradient-to-br from-[var(--glido-primary-light)] to-white text-[var(--glido-ink)] overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, var(--glido-ink) 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="flex -space-x-2 shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-[var(--glido-primary)] flex items-center justify-center ring-4 ring-white">
                  <UtensilsCrossed size={20} className="text-white" />
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[var(--glido-success)] flex items-center justify-center ring-4 ring-white">
                  <ShoppingCart size={20} className="text-white" />
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#2563EB] flex items-center justify-center ring-4 ring-white">
                  <Car size={20} className="text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[var(--glido-muted)] text-xs font-semibold uppercase tracking-wide mb-1">
                  <Smartphone size={14} /> Glido for Android
                </div>
                <h3 className="font-bold text-xl text-[var(--glido-ink)]">Food, grocery and rides — in one app</h3>
                <p className="text-sm text-[var(--glido-muted)] mt-1.5 max-w-md">
                  Everything on this site, faster on your phone. Direct APK download — no Play
                  Store needed.
                </p>
                <ul className="mt-4 space-y-1.5">
                  {APP_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[var(--glido-ink)]">
                      <Check size={15} className="text-[var(--glido-success)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <a
              href={APP_DOWNLOADS.customer}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 shrink-0 w-full md:w-auto justify-center"
            >
              <Download size={18} /> Download for Android
            </a>
          </div>
        </div>
      </section>

      {/* How Glido works */}
      <section className="bg-white border-y border-[var(--glido-border)]">
        <div className="container-glido py-12">
          <h2 className="text-xl font-bold text-center mb-8">How Glido works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="text-center">
                  <div className="h-12 w-12 rounded-full bg-[var(--glido-primary-light)] flex items-center justify-center mx-auto mb-3">
                    <Icon size={22} className="text-[var(--glido-primary)]" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-[var(--glido-muted)] mt-1">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partner / driver CTA */}
      <section className="container-glido py-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glido p-6 bg-[var(--glido-primary-light)] border-none">
          <h3 className="font-bold text-lg">Partner with Glido</h3>
          <p className="text-sm text-[var(--glido-muted)] mt-1">
            List your restaurant or store and reach thousands of local customers.
          </p>
          <Link href="/partner-with-us" className="btn-primary inline-block mt-4">
            Become a partner
          </Link>
        </div>
        <div className="card-glido p-6 bg-[var(--glido-accent-light)] border-none">
          <h3 className="font-bold text-lg">Deliver with Glido</h3>
          <p className="text-sm text-[var(--glido-muted)] mt-1">
            Flexible hours, weekly payouts. Be your own boss.
          </p>
          <Link href="/become-a-delivery-partner" className="btn-secondary inline-block mt-4">
            Become a delivery partner
          </Link>
        </div>
      </section>
    </div>
  );
}
