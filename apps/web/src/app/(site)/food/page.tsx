"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, SearchX } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Paginated, Restaurant } from "@/lib/types";
import { RestaurantCard, RestaurantCardSkeleton } from "@/components/restaurant-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { TriServiceSwitcher } from "@/components/tri-service-switcher";

type SortKey = "relevance" | "rating" | "delivery_time" | "cost_low" | "cost_high";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "rating", label: "Rating: High to low" },
  { key: "delivery_time", label: "Delivery time" },
  { key: "cost_low", label: "Cost: Low to high" },
  { key: "cost_high", label: "Cost: High to low" },
];

function FoodListing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("relevance");

  const sortedRestaurants = useMemo(() => {
    if (!restaurants) return restaurants;
    const list = [...restaurants];
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
  }, [restaurants, sort]);

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
      <section className="relative overflow-hidden bg-[var(--glido-ink)] mb-6">
        <div
          className="absolute inset-0 opacity-90"
          style={{ background: "radial-gradient(120% 100% at 15% 0%, #ff8a00 0%, var(--glido-food) 45%, #14121a 85%)" }}
        />
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

      <div className="container-glido -mt-3 mb-5">
        <TriServiceSwitcher className="shadow-lg" />
      </div>

      <div className="container-glido">

      {!error && !loading && restaurants && restaurants.length > 0 && (
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
                  : "bg-white text-[var(--glido-muted)] border-[var(--glido-border)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

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

      {!error && !loading && sortedRestaurants && sortedRestaurants.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRestaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
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
