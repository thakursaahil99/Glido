"use client";

import { useEffect, useState } from "react";
import { Bike } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Driver, Paginated, RideType } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

const STATUS_TABS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
const emptyForm = { name: "", phone: "", vehicleNumber: "", vehicleModel: "", rideTypeId: "" };

export default function AdminDriversPage() {
  return (
    <RequirePermission permission="manage_drivers">
      <DriversContent />
    </RequirePermission>
  );
}

function DriversContent() {
  const { show } = useToast();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [rideTypes, setRideTypes] = useState<RideType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [viewing, setViewing] = useState<Driver | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<Driver>>(
        `/admin/cab/drivers?pageSize=100${status !== "ALL" ? `&status=${status}` : ""}`,
      );
      setDrivers(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load drivers.");
    }
  }

  useEffect(() => {
    api.get<RideType[]>("/admin/cab/ride-types").then(setRideTypes);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch(`/admin/cab/drivers/${id}`, { status: newStatus });
      show(`Driver ${newStatus.toLowerCase()}`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update driver.", "error");
    }
  }

  async function toggleOnline(d: Driver) {
    try {
      await api.patch(`/admin/cab/drivers/${d.id}`, { isOnline: !d.isOnline });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update driver.", "error");
    }
  }

  async function createDriver(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/cab/drivers", form);
      show("Driver added (pending approval)", "success");
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not add driver.", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cab Drivers</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add driver
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${
              status === tab ? "bg-[var(--glido-primary)] text-white" : "bg-white border border-[var(--glido-border)] text-[var(--glido-muted)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && drivers === null && <div className="h-40 skeleton" />}
      {!error && drivers && drivers.length === 0 && <EmptyState icon={Bike} title="No drivers in this status" />}

      {!error && drivers && drivers.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50">
                <th className="py-2.5 px-4">Driver</th>
                <th className="py-2.5 px-4">Vehicle</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Online</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <button onClick={() => setViewing(d)} className="font-medium text-left hover:underline hover:text-[var(--glido-primary)]">
                      {d.name}
                    </button>
                    <p className="text-xs text-[var(--glido-muted)]">{d.phone}</p>
                  </td>
                  <td className="py-2.5 px-4 text-xs">
                    {d.vehicleModel}
                    <br />
                    {d.vehicleNumber}
                  </td>
                  <td className="py-2.5 px-4">{d.rideType?.name}</td>
                  <td className="py-2.5 px-4">
                    <span className="badge badge-status">{d.status}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => toggleOnline(d)}
                      disabled={d.status !== "APPROVED"}
                      className={`${d.isOnline ? "text-[var(--glido-primary)]" : "text-[var(--glido-muted)]"} disabled:opacity-40`}
                    >
                      {d.isOnline ? "Online" : "Offline"}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 space-x-2">
                    {d.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(d.id, "APPROVED")} className="text-[var(--glido-primary)] font-medium">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(d.id, "REJECTED")} className="text-[var(--glido-danger)] font-medium">
                          Reject
                        </button>
                      </>
                    )}
                    {d.status === "APPROVED" && (
                      <button onClick={() => updateStatus(d.id, "SUSPENDED")} className="text-[var(--glido-danger)] font-medium">
                        Suspend
                      </button>
                    )}
                    {d.status === "SUSPENDED" && (
                      <button onClick={() => updateStatus(d.id, "APPROVED")} className="text-[var(--glido-primary)] font-medium">
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

      <Modal open={showCreate} title="Add driver" onClose={() => setShowCreate(false)}>
        <form onSubmit={createDriver} className="space-y-2">
          <input className="input-glido" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-glido" placeholder="Phone (e.g. +919800000000)" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="input-glido" required value={form.rideTypeId} onChange={(e) => setForm({ ...form, rideTypeId: e.target.value })}>
            <option value="">Vehicle type</option>
            {rideTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <input className="input-glido" placeholder="Vehicle model (e.g. Maruti Swift)" value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} />
          <input className="input-glido" placeholder="Vehicle number" required value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
          <button className="btn-primary w-full mt-2">Add driver</button>
        </form>
      </Modal>

      <Modal open={!!viewing} title="Driver details" onClose={() => setViewing(null)}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {resolveMediaUrl(viewing.photoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(viewing.photoUrl)!} alt={viewing.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bike size={22} className="text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-semibold">{viewing.name}</p>
                <p className="text-[var(--glido-muted)]">{viewing.phone}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-[var(--glido-muted)]">Vehicle</dt>
              <dd>{viewing.vehicleModel ?? "—"} ({viewing.vehicleNumber})</dd>
              <dt className="text-[var(--glido-muted)]">Ride type</dt>
              <dd>{viewing.rideType?.name ?? "—"}</dd>
              <dt className="text-[var(--glido-muted)]">City</dt>
              <dd>{viewing.city?.name ?? "—"}</dd>
              <dt className="text-[var(--glido-muted)]">Status</dt>
              <dd>{viewing.status}</dd>
              <dt className="text-[var(--glido-muted)]">Online / Available</dt>
              <dd>{viewing.isOnline ? "Online" : "Offline"} · {viewing.isAvailable ? "Available" : "Busy"}</dd>
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
