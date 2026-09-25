"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/** Shown on checkout/booking screens when the signed-in user has no phone on file yet —
 * a phone number is required before placing an order or booking a ride, but doesn't need OTP. */
export function PhoneRequiredField() {
  const { user, refreshUser } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.phone) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!PHONE_REGEX.test(trimmed)) {
      setError("Enter a valid phone number (digits only, optionally starting with +).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.patch("/users/me", { phone: trimmed });
      await refreshUser();
      show("Phone number saved", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save phone number.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card-glido p-4 mb-4 border-2 border-[var(--glido-primary)]">
      <h2 className="font-semibold mb-1 flex items-center gap-1.5">
        <Phone size={16} /> Phone number required
      </h2>
      <p className="text-xs text-[var(--glido-muted)] mb-3">
        We need a phone number on file so your delivery partner or driver can reach you.
      </p>
      <form onSubmit={save} className="flex gap-2">
        <input
          className="input-glido"
          type="tel"
          placeholder="e.g. +919800000000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <button className="btn-primary shrink-0" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
      {error && <p className="text-sm text-[var(--glido-danger)] mt-2">{error}</p>}
    </section>
  );
}
