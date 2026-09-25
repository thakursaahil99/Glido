"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Flame, SearchX, Soup, Sparkles, UtensilsCrossed } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Paginated, Restaurant } from "@/lib/types";
import { RestaurantCard, RestaurantCardSkeleton } from "@/components/restaurant-card";
import { EmptyState, ErrorState } from "@/components/empty-state";

type SortKey = "relevance" | "rating" | "delivery_time" | "cost_low" | "cost_high";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "rating", label: "Rating: High to low" },
  { key: "delivery_time", label: "Delivery time" },
  { key: "cost_low", label: "Cost: Low to high" },
  { key: "cost_high", label: "Cost: High to low" },
];

// Quick filters are plain predicates over data we already loaded — no fabricated claims.
type QuickFilterKey = "freeDelivery" | "topRated" | "fastDelivery" | "openNow";
const QUICK_FILTERS: { key: QuickFilterKey; label: string; test: (r: Restaurant) => boolean }[] = [
  { key: "openNow", label: "Open now", test: (r) => r.isOpen },
  { key: "freeDelivery", label: "0 delivery fee", test: (r) => r.deliveryFee === 0 },
  { key: "topRated", label: "Rated 4.0+", test: (r) => r.ratingAvg >= 4 },
  { key: "fastDelivery", label: "Under 30 min", test: (r) => r.avgDeliveryTimeMin <= 30 },
];

const CUISINE_ICONS = [UtensilsCrossed, Soup, Flame, Sparkles];

function FoodListing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilterKey>>(new Set());
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);

  function toggleFilter(key: QuickFilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Real cuisine tags pulled from the loaded restaurants, ranked by how often they occur —
  // this is the "What's on your mind?" tile grid, built from actual data, not a fixed list.
  const cuisineTiles = useMemo(() => {
    if (!restaurants) return [];
    const counts = new Map<string, number>();
    for (const r of restaurants) {
      if (!r.cuisineTags) continue;
      for (const raw of r.cuisineTags.split(",")) {
        const name = raw.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [restaurants]);

  // "Trending Near You": top-rated restaurants among those with at least one real rating —
  // a legitimate signal derived from ratingAvg, not a fabricated badge.
  const trending = useMemo(() => {
    if (!restaurants) return [];
    return [...restaurants]
      .filter((r) => r.ratingCount > 0)
      .sort((a, b) => b.ratingAvg - a.ratingAvg)
      .slice(0, 8);
  }, [restaurants]);

  const quickFiltered = useMemo(() => {
    if (!restaurants) return restaurants;
    return restaurants.filter((r) => {
      for (const key of activeFilters) {
        const filter = QUICK_FILTERS.find((f) => f.key === key);
        if (filter && !filter.test(r)) return false;
      }
      if (activeCuisine && !(r.cuisineTags ?? "").toLowerCase().includes(activeCuisine.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [restaurants, activeFilters, activeCuisine]);

  const sortedRestaurants = useMemo(() => {
    if (!quickFiltered) return quickFiltered;
    const list = [...quickFiltered];
    switch (sort) {
      case "rating":
        return list.sort((a, b) => b.ratingAvg - a.ratingAvg);
      case "delivery_time":
        return list.sort((a, b) => a.avgDeliveryTimeMin - b.avgDeliveryTimeMin);
      case "cost_low":
        return list.sort((a, b) => a.minOrderAmount - b.minOrderAmount);
      case "cost_high":
        return list.sort((a, b) => b.minOrderAmount - a.minOrderAmount);
      default:
        return list;
    }
  }, [quickFiltered, sort]);

  async function load(query: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<Restaurant>>(
        `/restaurants?pageSize=24${query ? `&search=${encodeURIComponent(query)}` : ""}`,
      );
      setRestaurants(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load restaurants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/food${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <div className="pb-8">
      <section className="relative overflow-hidden bg-[var(--glido-hero-bg)] mb-6">
        <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "var(--glido-food)" }} />
        <div className="absolute left-1/4 -bottom-16 w-56 h-56 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "var(--glido-accent)" }} />
        <div className="container-glido relative z-10 py-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Order food online</h1>
          <p className="text-sm text-white/80 mt-1">Restaurants and cuisines near you, delivered hot.</p>
          <form onSubmit={onSubmit} className="mt-4 flex gap-2 max-w-lg">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants or cuisines..."
              className="input-glido !border-none shadow-xl"
            />
            <button
              className="shrink-0 rounded-2xl px-5 font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(120deg, #ff8a00, var(--glido-food) 60%, var(--glido-food-dark))" }}
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="container-glido pt-6">

      {error && <ErrorState message={error} onRetry={() => load(initialSearch)} />}

      {!error && loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!error && !loading && restaurants && restaurants.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="No restaurants found"
          description="Try a different search term, or check back soon as more partners join Glido."
        />
      )}

      {!error && !loading && restaurants && restaurants.length > 0 && (
        <>
          {/* Non-numeric promo CTA — there is no real platform-wide discount signal on this
              page, so this stays generic instead of hardcoding a fake percentage. */}
          <a
            href="#restaurants"
            className="block rounded-3xl p-5 md:p-6 mb-8 relative overflow-hidden text-white shadow-xl transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(120deg, #ff8a00, var(--glido-food) 55%, var(--glido-food-dark))" }}
          >
            <div className="absolute -right-8 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 rounded-full px-2 py-1 mb-2">
                  <Flame size={11} /> Great deals near you
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold leading-tight">Hungry? We&apos;ve got you covered</h2>
                <p className="text-xs text-white/80 mt-1">Top-rated restaurants, delivered fast</p>
              </div>
              <span className="shrink-0 rounded-full bg-white text-[var(--glido-hero-bg)] text-sm font-bold px-4 py-2">
                Explore
              </span>
            </div>
          </a>

          {cuisineTiles.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold mb-3">What&apos;s on your mind?</h2>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                <button onClick={() => setActiveCuisine(null)} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl border-2 ${
                      activeCuisine === null
                        ? "border-[var(--glido-food)] bg-[var(--glido-primary-light)]"
                        : "border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)]"
                    }`}
                  >
                    <UtensilsCrossed size={20} className={activeCuisine === null ? "text-[var(--glido-food-dark)]" : "text-[var(--glido-muted)]"} />
                  </span>
                  <span className={`text-xs font-medium text-center leading-tight ${activeCuisine === null ? "text-[var(--glido-food-dark)]" : "text-[var(--glido-muted)]"}`}>
                    All
                  </span>
                </button>
                {cuisineTiles.map((name, i) => {
                  const Icon = CUISINE_ICONS[i % CUISINE_ICONS.length];
                  const active = activeCuisine === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setActiveCuisine(active ? null : name)}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl border-2 ${
                          active ? "border-[var(--glido-food)] bg-[var(--glido-primary-light)]" : "border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)]"
                        }`}
                      >
                        <Icon size={20} className={active ? "text-[var(--glido-food-dark)]" : "text-[var(--glido-muted)]"} />
                      </span>
                      <span className={`text-xs font-medium text-center leading-tight truncate max-w-[4.5rem] ${active ? "text-[var(--glido-food-dark)]" : "text-[var(--glido-muted)]"}`}>
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {trending.length >= 3 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[var(--glido-food-dark)]" />
                <h2 className="text-base font-bold">Trending Near You</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {trending.map((r) => (
                  <div key={r.id} className="w-64 shrink-0">
                    <RestaurantCard restaurant={r} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div id="restaurants" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border ${
                    activeFilters.has(f.key)
                      ? "bg-[var(--glido-food)] text-white border-[var(--glido-food)]"
                      : "bg-white dark:bg-[var(--glido-surface)] text-[var(--glido-muted)] border-[var(--glido-border)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--glido-muted)] shrink-0">
                <ArrowUpDown size={13} /> Sort by
              </span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border ${
                    sort === opt.key
                      ? "bg-[var(--glido-primary)] text-white border-[var(--glido-primary)]"
                      : "bg-white dark:bg-[var(--glido-surface)] text-[var(--glido-muted)] border-[var(--glido-border)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {sortedRestaurants && sortedRestaurants.length === 0 && (
              <EmptyState
                icon={SearchX}
                title="No restaurants match these filters"
                description="Try clearing a filter or picking a different cuisine."
              />
            )}

            {sortedRestaurants && sortedRestaurants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedRestaurants.map((r) => (
                  <RestaurantCard key={r.id} restaurant={r} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default function FoodPage() {
  return (
    <Suspense fallback={null}>
      <FoodListing />
    </Suspense>
  );
}
