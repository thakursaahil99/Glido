"use client";

import { useEffect, useState } from "react";
import { Percent, Save, ShoppingCart, Truck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { PlatformSettings } from "@/lib/types";
import { ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

export default function AdminSettingsPage() {
  return (
    <RequirePermission permission="manage_settings">
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const { show } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      setSettings(await api.get<PlatformSettings>("/settings"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load settings.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.patch<PlatformSettings>("/admin/settings", settings);
      setSettings(updated);
      show("Settings saved", "success");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Platform settings</h1>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        These figures apply platform-wide and take effect immediately — no redeploy needed. Per-restaurant
        delivery/packaging fees are set on each restaurant instead.
      </p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && settings === null && <div className="h-64 skeleton" />}

      {!error && settings && (
        <form onSubmit={save} className="card-glido p-5 space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
              <Percent size={16} className="text-[var(--glido-primary)]" /> Tax rate
            </label>
            <p className="text-xs text-[var(--glido-muted)] mb-2">
              Applied to the item subtotal on every Food and Grocery order.
            </p>
            <div className="relative max-w-40">
              <input
                type="number"
                min={0}
                step={0.1}
                className="input-glido pr-8"
                value={settings.taxRatePercent}
                onChange={(e) => setSettings({ ...settings, taxRatePercent: Number(e.target.value) })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--glido-muted)]">%</span>
            </div>
          </div>

          <div className="border-t border-[var(--glido-border)] pt-5">
            <label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
              <Truck size={16} className="text-[var(--glido-primary)]" /> Grocery delivery fee
            </label>
            <p className="text-xs text-[var(--glido-muted)] mb-2">Charged on grocery orders below the free-delivery threshold.</p>
            <div className="relative max-w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--glido-muted)]">₹</span>
              <input
                type="number"
                min={0}
                className="input-glido pl-7"
                value={settings.groceryDeliveryFee}
                onChange={(e) => setSettings({ ...settings, groceryDeliveryFee: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t border-[var(--glido-border)] pt-5">
            <label className="flex items-center gap-2 text-sm font-semibold mb-1.5">
              <ShoppingCart size={16} className="text-[var(--glido-primary)]" /> Free delivery threshold (Grocery)
            </label>
            <p className="text-xs text-[var(--glido-muted)] mb-2">
              Grocery orders at or above this subtotal get free delivery.
            </p>
            <div className="relative max-w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--glido-muted)]">₹</span>
              <input
                type="number"
                min={0}
                className="input-glido pl-7"
                value={settings.groceryFreeDeliveryThreshold}
                onChange={(e) => setSettings({ ...settings, groceryFreeDeliveryThreshold: Number(e.target.value) })}
              />
            </div>
          </div>

          <button className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}
