"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Paginated, Restaurant } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { RequirePermission } from "@/components/require-permission";

const STATUS_TABS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
const PAGE_SIZE = 50;

function RestaurantsList() {
  const { show } = useToast();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as (typeof STATUS_TABS)[number]) ?? "ALL";

  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>(initialStatus);
  const [page, setPage] = useState(1);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", cuisineTags: "", imageUrl: "", deliveryFee: 25, packagingFee: 10, minOrderAmount: 0 });
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<Restaurant>>(
        `/admin/restaurants?page=${page}&pageSize=${PAGE_SIZE}${status !== "ALL" ? `&status=${status}` : ""}`,
      );
      setRestaurants(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load restaurants.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch(`/admin/restaurants/${id}/status`, { status: newStatus });
      show(`Restaurant ${newStatus.toLowerCase()}`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update status.", "error");
    }
  }

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/restaurants", form);
      show("Restaurant created (pending approval)", "success");
      setShowCreate(false);
      setForm({ name: "", description: "", cuisineTags: "", imageUrl: "", deliveryFee: 25, packagingFee: 10, minOrderAmount: 0 });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create restaurant.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add restaurant
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${
              status === tab ? "bg-[var(--glido-primary)] text-white" : "bg-white dark:bg-[var(--glido-surface)] border border-[var(--glido-border)] text-[var(--glido-muted)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && restaurants === null && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 skeleton" />
          ))}
        </div>
      )}

      {!error && restaurants && restaurants.length === 0 && (
        <EmptyState icon={UtensilsCrossed} title="No restaurants in this status" />
      )}

      {!error && restaurants && restaurants.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Open</th>
                <th className="py-2.5 px-4">Rating</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <Link href={`/admin/restaurants/${r.id}`} className="font-medium text-[var(--glido-primary)]">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="badge badge-status">{r.status}</span>
                  </td>
                  <td className="py-2.5 px-4">{r.isOpen ? "Open" : "Closed"}</td>
                  <td className="py-2.5 px-4">★ {r.ratingAvg?.toFixed(1) ?? "—"}</td>
                  <td className="py-2.5 px-4 space-x-2">
                    {r.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(r.id, "APPROVED")} className="text-[var(--glido-primary)] font-medium">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(r.id, "REJECTED")} className="text-[var(--glido-danger)] font-medium">
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === "APPROVED" && (
                      <button onClick={() => updateStatus(r.id, "SUSPENDED")} className="text-[var(--glido-danger)] font-medium">
                        Suspend
                      </button>
                    )}
                    {r.status === "SUSPENDED" && (
                      <button onClick={() => updateStatus(r.id, "APPROVED")} className="text-[var(--glido-primary)] font-medium">
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={showCreate} title="Add restaurant" onClose={() => setShowCreate(false)}>
        <form onSubmit={createRestaurant} className="space-y-2">
          <input className="input-glido" placeholder="Restaurant name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-glido" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input-glido" placeholder="Cuisine tags (comma separated)" value={form.cuisineTags} onChange={(e) => setForm({ ...form, cuisineTags: e.target.value })} />
          <ImageUploadField label="Cover image" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">
              Delivery fee
              <input type="number" className="input-glido mt-1" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Packaging fee
              <input type="number" className="input-glido mt-1" value={form.packagingFee} onChange={(e) => setForm({ ...form, packagingFee: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Min order
              <input type="number" className="input-glido mt-1" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} />
            </label>
          </div>
          <button className="btn-primary w-full mt-2" disabled={creating}>
            {creating ? "Creating..." : "Create restaurant"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

export default function AdminRestaurantsPage() {
  return (
    <RequirePermission permission="manage_restaurants">
      <Suspense fallback={null}>
        <RestaurantsList />
      </Suspense>
    </RequirePermission>
  );
}
