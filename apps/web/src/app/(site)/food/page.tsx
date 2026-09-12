"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Paginated, Restaurant } from "@/lib/types";
import { RestaurantCard, RestaurantCardSkeleton } from "@/components/restaurant-card";
import { EmptyState, ErrorState } from "@/components/empty-state";

function FoodListing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="container-glido py-8">
      <h1 className="text-2xl font-bold mb-4">Order food online</h1>
      <form onSubmit={onSubmit} className="flex gap-2 mb-6 max-w-lg">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search restaurants or cuisines..."
          className="input-glido"
        />
        <button className="btn-primary shrink-0">Search</button>
      </form>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
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
