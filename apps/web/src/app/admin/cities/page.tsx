"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { City } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { MapView } from "@/components/map-view";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

const DEFAULT_CENTER = { lat: 18.9647, lng: 72.8258 }; // Mumbai — used when a new zone has no center yet

interface ZoneForm {
  name: string;
  state: string;
  centerLat: number | null;
  centerLng: number | null;
  serviceRadiusKm: number;
  isActive: boolean;
}

const emptyForm: ZoneForm = { name: "", state: "", centerLat: null, centerLng: null, serviceRadiusKm: 15, isActive: true };

export default function AdminCitiesPage() {
  return (
    <RequirePermission permission="manage_settings">
      <CitiesContent />
    </RequirePermission>
  );
}

function CitiesContent() {
  const { show } = useToast();
  const [cities, setCities] = useState<City[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm);

  async function load() {
    setError(null);
    try {
      setCities(await api.get<City[]>("/cities"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load cities.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(city: City) {
    try {
      await api.patch(`/admin/cities/${city.id}`, { isActive: !city.isActive });
      show(city.isActive ? "Zone deactivated" : "Zone activated", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update zone.", "error");
    }
  }

  async function createZone(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/cities", form);
      show("Service zone created", "success");
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create zone.", "error");
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.patch(`/admin/cities/${editing.id}`, {
        name: editing.name,
        state: editing.state,
        centerLat: editing.centerLat,
        centerLng: editing.centerLng,
        serviceRadiusKm: editing.serviceRadiusKm,
      });
      show("Zone updated", "success");
      setEditing(null);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update zone.", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Cities & Service Zones</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add zone
        </button>
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        Draw the area Glido actually operates in. Cab rides can only be booked with a pickup inside
        an active zone&apos;s circle — set a zone here once and it&apos;s enforced automatically.
        Zones with no center point set are unrestricted.
      </p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && cities === null && <div className="h-40 skeleton" />}
      {!error && cities && cities.length === 0 && <EmptyState icon={MapPin} title="No cities yet" />}

      {!error && cities && cities.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">City</th>
                <th className="py-2.5 px-4">Zone</th>
                <th className="py-2.5 px-4">Radius</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => (
                <tr key={c.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-[var(--glido-muted)]">{c.state}</p>
                  </td>
                  <td className="py-2.5 px-4">
                    {c.centerLat != null ? (
                      <span className="badge badge-veg">Configured</span>
                    ) : (
                      <span className="badge badge-muted">Not set — unrestricted</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">{c.centerLat != null ? `${c.serviceRadiusKm} km` : "—"}</td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${c.isActive ? "badge-veg" : "badge-muted"}`}>{c.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="py-2.5 px-4 space-x-3">
                    <button onClick={() => setEditing(c)} className="text-[var(--glido-primary)] font-medium">
                      Edit area
                    </button>
                    <button onClick={() => toggleActive(c)} className="text-[var(--glido-muted)] font-medium">
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} title="Add a service zone" onClose={() => setShowCreate(false)}>
        <form onSubmit={createZone} className="space-y-2">
          <input className="input-glido" placeholder="City name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-glido" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <ZoneMapPicker
            center={form.centerLat != null && form.centerLng != null ? { lat: form.centerLat, lng: form.centerLng } : DEFAULT_CENTER}
            radiusKm={form.serviceRadiusKm}
            onPick={(lat, lng) => setForm({ ...form, centerLat: lat, centerLng: lng })}
          />
          <label className="text-xs block">
            Service radius: {form.serviceRadiusKm} km
            <input
              type="range"
              min={1}
              max={60}
              value={form.serviceRadiusKm}
              onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
              className="w-full mt-1"
            />
          </label>
          <button className="btn-primary w-full mt-2">Create zone</button>
        </form>
      </Modal>

      {editing && (
        <Modal open title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="space-y-2">
            <input className="input-glido" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="input-glido" placeholder="State" value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
            <ZoneMapPicker
              center={editing.centerLat != null && editing.centerLng != null ? { lat: editing.centerLat, lng: editing.centerLng } : DEFAULT_CENTER}
              radiusKm={editing.serviceRadiusKm}
              onPick={(lat, lng) => setEditing({ ...editing, centerLat: lat, centerLng: lng })}
            />
            <label className="text-xs block">
              Service radius: {editing.serviceRadiusKm} km
              <input
                type="range"
                min={1}
                max={60}
                value={editing.serviceRadiusKm}
                onChange={(e) => setEditing({ ...editing, serviceRadiusKm: Number(e.target.value) })}
                className="w-full mt-1"
              />
            </label>
            <button className="btn-primary w-full mt-2">Save zone</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ZoneMapPicker({
  center,
  radiusKm,
  onPick,
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--glido-muted)] mb-1">Tap the map to set the zone&apos;s center point</p>
      <MapView
        center={center}
        zoom={11}
        markers={[{ lat: center.lat, lng: center.lng, kind: "pin", color: "#FF6A00" }]}
        circles={[{ lat: center.lat, lng: center.lng, radiusMeters: radiusKm * 1000 }]}
        onClick={onPick}
        height="240px"
      />
    </div>
  );
}
