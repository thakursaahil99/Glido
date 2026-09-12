"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Restaurant } from "@/lib/types";
import { ErrorState } from "@/components/empty-state";

export default function PartnerDashboardPage() {
  const { show } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      setRestaurant(await api.get<Restaurant>("/partner/restaurant"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your restaurant.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleOpen() {
    if (!restaurant) return;
    try {
      const updated = await api.patch<Restaurant>("/partner/restaurant", { isOpen: !restaurant.isOpen });
      setRestaurant(updated);
      show(updated.isOpen ? "You're now open for orders" : "You're now closed", "success");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update.", "error");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    try {
      const updated = await api.patch<Restaurant>("/partner/restaurant", {
        name: restaurant.name,
        description: restaurant.description ?? undefined,
        cuisineTags: restaurant.cuisineTags ?? undefined,
        avgDeliveryTimeMin: restaurant.avgDeliveryTimeMin,
        deliveryFee: restaurant.deliveryFee,
        packagingFee: restaurant.packagingFee,
        minOrderAmount: restaurant.minOrderAmount,
      });
      setRestaurant(updated);
      show("Profile saved", "success");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not save.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!restaurant) return <div className="h-64 skeleton max-w-2xl" />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <button
          onClick={toggleOpen}
          className={restaurant.isOpen ? "btn-danger-outline" : "btn-primary"}
        >
          {restaurant.isOpen ? "Close restaurant" : "Open restaurant"}
        </button>
      </div>

      <div className="card-glido p-4 mb-6 flex items-center gap-4 text-sm">
        <span className={`badge ${restaurant.status === "APPROVED" ? "badge-veg" : "badge-muted"}`}>
          {restaurant.status}
        </span>
        <span className={`badge ${restaurant.isOpen ? "badge-veg" : "badge-muted"}`}>
          {restaurant.isOpen ? "Open" : "Closed"}
        </span>
        <span className="text-[var(--glido-muted)]">★ {restaurant.ratingAvg.toFixed(1)} ({restaurant.ratingCount})</span>
      </div>

      <form onSubmit={saveProfile} className="card-glido p-5 space-y-4">
        <h2 className="font-semibold">Restaurant profile</h2>
        <label className="block text-sm font-medium">
          Name
          <input
            className="input-glido mt-1"
            value={restaurant.name}
            onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea
            className="input-glido mt-1"
            rows={2}
            value={restaurant.description ?? ""}
            onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium">
          Cuisine tags (comma separated)
          <input
            className="input-glido mt-1"
            value={restaurant.cuisineTags ?? ""}
            onChange={(e) => setRestaurant({ ...restaurant, cuisineTags: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Avg delivery time (min)
            <input
              type="number"
              min={0}
              className="input-glido mt-1"
              value={restaurant.avgDeliveryTimeMin}
              onChange={(e) => setRestaurant({ ...restaurant, avgDeliveryTimeMin: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm font-medium">
            Min order amount (₹)
            <input
              type="number"
              min={0}
              className="input-glido mt-1"
              value={restaurant.minOrderAmount}
              onChange={(e) => setRestaurant({ ...restaurant, minOrderAmount: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm font-medium">
            Delivery fee (₹)
            <input
              type="number"
              min={0}
              className="input-glido mt-1"
              value={restaurant.deliveryFee}
              onChange={(e) => setRestaurant({ ...restaurant, deliveryFee: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm font-medium">
            Packaging fee (₹)
            <input
              type="number"
              min={0}
              className="input-glido mt-1"
              value={restaurant.packagingFee}
              onChange={(e) => setRestaurant({ ...restaurant, packagingFee: Number(e.target.value) })}
            />
          </label>
        </div>
        <button className="btn-primary flex items-center gap-2" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
