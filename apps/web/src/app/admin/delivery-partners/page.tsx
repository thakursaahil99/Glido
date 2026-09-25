"use client";

import { useEffect, useState } from "react";
import { Bike } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { DeliveryPartner, Paginated } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

const STATUS_TABS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
const emptyForm = { name: "", phone: "", vehicleType: "Bike", vehicleNumber: "" };

export default function AdminDeliveryPartnersPage() {
  return (
    <RequirePermission permission="manage_drivers">
      <DeliveryPartnersContent />
    </RequirePermission>
  );
}

function DeliveryPartnersContent() {
  const { show } = useToast();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [partners, setPartners] = useState<DeliveryPartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewing, setViewing] = useState<DeliveryPartner | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<DeliveryPartner>>(
        `/admin/delivery-partners?pageSize=100${status !== "ALL" ? `&status=${status}` : ""}`,
      );
      setPartners(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load delivery partners.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch(`/admin/delivery-partners/${id}`, { status: newStatus });
      show(`Delivery partner ${newStatus.toLowerCase()}`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update delivery partner.", "error");
    }
  }

  async function toggleOnline(p: DeliveryPartner) {
    try {
      await api.patch(`/admin/delivery-partners/${p.id}`, { isOnline: !p.isOnline });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update delivery partner.", "error");
    }
  }

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/delivery-partners", form);
      show("Delivery partner added (pending approval)", "success");
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not add delivery partner.", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Delivery Partners</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add partner
        </button>
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        Riders who deliver Food & Grocery orders. When an order is marked <strong>Ready</strong>, the
        nearest available online partner is assigned automatically.
      </p>

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
      {!error && partners === null && <div className="h-40 skeleton" />}
      {!error && partners && partners.length === 0 && <EmptyState icon={Bike} title="No delivery partners in this status" />}

      {!error && partners && partners.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Partner</th>
                <th className="py-2.5 px-4">Vehicle</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Online</th>
                <th className="py-2.5 px-4">Availability</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <button onClick={() => setViewing(p)} className="font-medium text-left hover:underline hover:text-[var(--glido-primary)]">
                      {p.name}
                    </button>
                    <p className="text-xs text-[var(--glido-muted)]">{p.phone}</p>
                  </td>
                  <td className="py-2.5 px-4 text-xs">
                    {p.vehicleType}
                    <br />
                    {p.vehicleNumber}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="badge badge-status">{p.status}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => toggleOnline(p)}
                      disabled={p.status !== "APPROVED"}
                      className={`${p.isOnline ? "text-[var(--glido-primary)]" : "text-[var(--glido-muted)]"} disabled:opacity-40`}
                    >
                      {p.isOnline ? "Online" : "Offline"}
                    </button>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${p.isAvailable ? "badge-veg" : "badge-muted"}`}>
                      {p.isAvailable ? "Available" : "On a delivery"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 space-x-2">
                    {p.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(p.id, "APPROVED")} className="text-[var(--glido-primary)] font-medium">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(p.id, "REJECTED")} className="text-[var(--glido-danger)] font-medium">
                          Reject
                        </button>
                      </>
                    )}
                    {p.status === "APPROVED" && (
                      <button onClick={() => updateStatus(p.id, "SUSPENDED")} className="text-[var(--glido-danger)] font-medium">
                        Suspend
                      </button>
                    )}
                    {p.status === "SUSPENDED" && (
                      <button onClick={() => updateStatus(p.id, "APPROVED")} className="text-[var(--glido-primary)] font-medium">
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} title="Add delivery partner" onClose={() => setShowCreate(false)}>
        <form onSubmit={createPartner} className="space-y-2">
          <input className="input-glido" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-glido" placeholder="Phone (e.g. +919800000000)" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="input-glido" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
            <option value="Bike">Bike</option>
            <option value="Bicycle">Bicycle</option>
            <option value="On foot">On foot</option>
          </select>
          <input className="input-glido" placeholder="Vehicle number (optional)" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
          <button className="btn-primary w-full mt-2">Add partner</button>
        </form>
      </Modal>

      <Modal open={!!viewing} title="Delivery partner details" onClose={() => setViewing(null)}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {resolveMediaUrl(viewing.photoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(viewing.photoUrl)!} alt={viewing.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-[var(--glido-surface-alt)] flex items-center justify-center">
                  <Bike size={22} className="text-gray-400 dark:text-[var(--glido-muted)]" />
                </div>
              )}
              <div>
                <p className="font-semibold">{viewing.name}</p>
                <p className="text-[var(--glido-muted)]">{viewing.phone}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-[var(--glido-muted)]">Vehicle</dt>
              <dd>{viewing.vehicleType} {viewing.vehicleNumber ? `(${viewing.vehicleNumber})` : ""}</dd>
              <dt className="text-[var(--glido-muted)]">City</dt>
              <dd>{viewing.city?.name ?? "—"}</dd>
              <dt className="text-[var(--glido-muted)]">Status</dt>
              <dd>{viewing.status}</dd>
              <dt className="text-[var(--glido-muted)]">Online / Available</dt>
              <dd>{viewing.isOnline ? "Online" : "Offline"} · {viewing.isAvailable ? "Available" : "On a delivery"}</dd>
              <dt className="text-[var(--glido-muted)]">Rating</dt>
              <dd>★ {viewing.ratingAvg.toFixed(1)} ({viewing.ratingCount} ratings)</dd>
              <dt className="text-[var(--glido-muted)]">Current location</dt>
              <dd>{viewing.currentLat != null ? `${viewing.currentLat.toFixed(4)}, ${viewing.currentLng?.toFixed(4)}` : "Not tracked yet"}</dd>
              <dt className="text-[var(--glido-muted)]">Joined</dt>
              <dd>{new Date(viewing.createdAt).toLocaleDateString()}</dd>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
