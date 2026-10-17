"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { isTrackable, useOrderTracking } from "@/lib/use-order-tracking";
import type { OrderTracking } from "@/lib/types";

function headline(t: OrderTracking, audience: "customer" | "staff") {
  const eta = t.etaMinutes != null ? `${t.etaMinutes} min` : null;
  switch (t.status) {
    case "OUT_FOR_DELIVERY":
      return audience === "customer"
        ? eta ? `Arriving in ~${eta}` : "Your order is on the way"
        : eta ? `Out for delivery · ~${eta} to drop` : "Out for delivery";
    case "READY":
      return t.rider ? `${t.rider.name} is heading to the restaurant` : "Ready — waiting for a delivery partner";
    case "PREPARING":
      return "Food is being prepared";
    case "ACCEPTED":
      return "Restaurant accepted the order";
    default:
      return "Waiting for the restaurant to confirm";
  }
}

function agoLabel(iso: string | null | undefined, now: number) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : "over an hour ago";
}

/**
 * Live map + ETA for one food order. Shared by the customer order page, the admin
 * order page and the restaurant partner order page — each gets the same view, the
 * API decides who's allowed to see it. Renders nothing once the order is finished.
 */
export function LiveOrderTracking({
  orderId,
  status,
  audience = "customer",
  height = "300px",
}: {
  orderId: string;
  /** The parent's view of the order status; tracking only runs while it's in flight. */
  status: string;
  audience?: "customer" | "staff";
  height?: string;
}) {
  const active = isTrackable(status);
  const { tracking, socketLive } = useOrderTracking(orderId, active);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  if (!tracking) return <div className="card-glido mb-4 skeleton" style={{ height }} />;

  const t = tracking;
  const restaurant = t.restaurant.lat != null && t.restaurant.lng != null ? { lat: t.restaurant.lat, lng: t.restaurant.lng } : null;
  const drop = t.drop.lat != null && t.drop.lng != null ? { lat: t.drop.lat, lng: t.drop.lng } : null;
  const rider = t.rider?.lat != null && t.rider.lng != null ? { lat: t.rider.lat, lng: t.rider.lng } : null;
  const seen = agoLabel(t.rider?.lastLocationAt, now);
  const stale = t.rider?.lastLocationAt ? now - new Date(t.rider.lastLocationAt).getTime() > 2 * 60_000 : false;

  if (!restaurant && !drop && !rider) {
    return (
      <div className="card-glido p-4 mb-4 flex items-center gap-2 text-sm text-[var(--glido-muted)]">
        <MapPin size={16} /> Live map will appear once a location is available for this order.
      </div>
    );
  }

  return (
    <div className="card-glido overflow-hidden mb-4" data-testid="live-tracking">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-lg leading-tight" data-testid="tracking-headline">{headline(t, audience)}</p>
          <p className="text-xs text-[var(--glido-muted)] mt-1">
            {t.remainingKm != null && `${t.remainingKm} km to go`}
            {t.remainingKm != null && t.rider && " · "}
            {t.rider && (rider ? `${t.rider.name} · location updated ${seen ?? "—"}` : `${t.rider.name} hasn't shared a location yet`)}
          </p>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{
            background: stale ? "var(--glido-surface-alt)" : "var(--glido-food-light)",
            color: stale ? "var(--glido-muted)" : "var(--glido-food-dark)",
          }}
          title={socketLive ? "Receiving live updates" : "Refreshing every few seconds"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${stale ? "bg-gray-400" : "bg-[var(--glido-food)] animate-pulse"}`} />
          {stale ? "Signal lost" : "LIVE"}
        </span>
      </div>
      <LiveTrackingMap
        restaurant={restaurant}
        drop={drop}
        rider={rider}
        riderHeading={t.rider?.heading ?? null}
        pickedUp={t.status === "OUT_FOR_DELIVERY"}
        height={height}
      />
      <div className="px-4 py-2.5 flex items-center gap-4 text-[11px] text-[var(--glido-muted)] flex-wrap">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1F2937]" /> {t.restaurant.name}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0EA36C]" /> {t.drop.label || "Delivery address"}</span>
        {t.rider && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--glido-food)]" /> Delivery partner</span>}
      </div>
    </div>
  );
}
