"use client";

import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Coupon } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

export default function AdminCouponsPage() {
  return (
    <RequirePermission permission="manage_coupons">
      <CouponsContent />
    </RequirePermission>
  );
}

function CouponsContent() {
  const { show } = useToast();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", type: "PERCENT" as "PERCENT" | "FLAT", value: 10, maxDiscount: 100, minOrderAmount: 0, usageLimit: 100, perUserLimit: 1 });
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    try {
      setCoupons(await api.get<Coupon[]>("/admin/coupons"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load coupons.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(c: Coupon) {
    try {
      await api.patch(`/admin/coupons/${c.id}`, { isActive: !c.isActive });
      show(c.isActive ? "Coupon deactivated" : "Coupon activated", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update coupon.", "error");
    }
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/coupons", { ...form, code: form.code.toUpperCase() });
      show("Coupon created", "success");
      setShowCreate(false);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create coupon.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New coupon
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && coupons === null && <div className="h-40 skeleton" />}
      {!error && coupons && coupons.length === 0 && <EmptyState icon={Tags} title="No coupons yet" />}

      {!error && coupons && coupons.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Discount</th>
                <th className="py-2.5 px-4">Min order</th>
                <th className="py-2.5 px-4">Used</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4 font-mono font-semibold">{c.code}</td>
                  <td className="py-2.5 px-4">{c.type === "PERCENT" ? `${c.value}%` : `₹${c.value}`}{c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ""}</td>
                  <td className="py-2.5 px-4">₹{c.minOrderAmount}</td>
                  <td className="py-2.5 px-4">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${c.isActive ? "badge-veg" : "badge-muted"}`}>{c.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => toggleActive(c)} className="text-[var(--glido-primary)] font-medium">
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} title="Create coupon" onClose={() => setShowCreate(false)}>
        <form onSubmit={createCoupon} className="space-y-2">
          <input className="input-glido" placeholder="Coupon code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Type
              <select className="input-glido mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FLAT" })}>
                <option value="PERCENT">Percentage</option>
                <option value="FLAT">Flat amount</option>
              </select>
            </label>
            <label className="text-xs">
              Value
              <input type="number" className="input-glido mt-1" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Max discount (₹)
              <input type="number" className="input-glido mt-1" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Min order (₹)
              <input type="number" className="input-glido mt-1" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Usage limit
              <input type="number" className="input-glido mt-1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Per-user limit
              <input type="number" className="input-glido mt-1" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })} />
            </label>
          </div>
          <button className="btn-primary w-full" disabled={creating}>{creating ? "Creating..." : "Create coupon"}</button>
        </form>
      </Modal>
    </div>
  );
}
