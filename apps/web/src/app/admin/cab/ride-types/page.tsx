"use client";

import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { RideType } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

const emptyForm = {
  name: "",
  imageUrl: "",
  baseFare: 30,
  perKmFare: 10,
  perMinuteFare: 1,
  minFare: 40,
  cancellationFee: 20,
  capacity: 4,
};

export default function AdminRideTypesPage() {
  return (
    <RequirePermission permission="manage_rides">
      <RideTypesContent />
    </RequirePermission>
  );
}

function RideTypesContent() {
  const { show } = useToast();
  const [rideTypes, setRideTypes] = useState<RideType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RideType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      setRideTypes(await api.get<RideType[]>("/admin/cab/ride-types"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load ride types.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(rt: RideType) {
    try {
      await api.patch(`/admin/cab/ride-types/${rt.id}`, { isActive: !rt.isActive });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update ride type.", "error");
    }
  }

  async function createRideType(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/cab/ride-types", form);
      show("Ride type created", "success");
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create ride type.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/cab/ride-types/${editing.id}`, editing);
      show("Ride type updated", "success");
      setEditing(null);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update ride type.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cab Ride Types & Fares</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add ride type
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && rideTypes === null && <div className="h-40 skeleton" />}
      {!error && rideTypes && rideTypes.length === 0 && <EmptyState icon={Car} title="No ride types yet" />}

      {!error && rideTypes && rideTypes.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Base fare</th>
                <th className="py-2.5 px-4">Per km</th>
                <th className="py-2.5 px-4">Per min</th>
                <th className="py-2.5 px-4">Min fare</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rideTypes.map((rt) => (
                <tr key={rt.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4 font-medium">{rt.name}</td>
                  <td className="py-2.5 px-4">₹{rt.baseFare}</td>
                  <td className="py-2.5 px-4">₹{rt.perKmFare}</td>
                  <td className="py-2.5 px-4">₹{rt.perMinuteFare}</td>
                  <td className="py-2.5 px-4">₹{rt.minFare}</td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${rt.isActive ? "badge-veg" : "badge-muted"}`}>{rt.isActive ? "Active" : "Hidden"}</span>
                  </td>
                  <td className="py-2.5 px-4 space-x-3">
                    <button onClick={() => setEditing(rt)} className="text-[var(--glido-primary)] font-medium">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(rt)} className="text-[var(--glido-muted)] font-medium">
                      {rt.isActive ? "Hide" : "Show"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} title="Add ride type" onClose={() => setShowCreate(false)}>
        <form onSubmit={createRideType} className="space-y-2">
          <input className="input-glido" placeholder="Name (e.g. Mini, SUV)" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <ImageUploadField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Base fare (₹)
              <input type="number" className="input-glido mt-1" value={form.baseFare} onChange={(e) => setForm({ ...form, baseFare: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Per km (₹)
              <input type="number" className="input-glido mt-1" value={form.perKmFare} onChange={(e) => setForm({ ...form, perKmFare: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Per minute (₹)
              <input type="number" className="input-glido mt-1" value={form.perMinuteFare} onChange={(e) => setForm({ ...form, perMinuteFare: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Minimum fare (₹)
              <input type="number" className="input-glido mt-1" value={form.minFare} onChange={(e) => setForm({ ...form, minFare: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Cancellation fee (₹)
              <input type="number" className="input-glido mt-1" value={form.cancellationFee} onChange={(e) => setForm({ ...form, cancellationFee: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Seats
              <input type="number" className="input-glido mt-1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </label>
          </div>
          <button className="btn-primary w-full mt-2" disabled={creating}>{creating ? "Creating..." : "Create ride type"}</button>
        </form>
      </Modal>

      {editing && (
        <Modal open title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="space-y-2">
            <input className="input-glido" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <ImageUploadField value={editing.imageUrl ?? ""} onChange={(imageUrl) => setEditing({ ...editing, imageUrl })} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                Base fare (₹)
                <input type="number" className="input-glido mt-1" value={editing.baseFare} onChange={(e) => setEditing({ ...editing, baseFare: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Per km (₹)
                <input type="number" className="input-glido mt-1" value={editing.perKmFare} onChange={(e) => setEditing({ ...editing, perKmFare: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Per minute (₹)
                <input type="number" className="input-glido mt-1" value={editing.perMinuteFare} onChange={(e) => setEditing({ ...editing, perMinuteFare: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Minimum fare (₹)
                <input type="number" className="input-glido mt-1" value={editing.minFare} onChange={(e) => setEditing({ ...editing, minFare: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Cancellation fee (₹)
                <input type="number" className="input-glido mt-1" value={editing.cancellationFee} onChange={(e) => setEditing({ ...editing, cancellationFee: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Seats
                <input type="number" className="input-glido mt-1" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })} />
              </label>
            </div>
            <button className="btn-primary w-full mt-2" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
