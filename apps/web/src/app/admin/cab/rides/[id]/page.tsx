"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import type { Ride, RideStatus } from "@/lib/types";
import { RideStatusBadge, RideTimeline } from "@/components/ride-status";
import { MapView, type MapMarker } from "@/components/map-view";
import { ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

const NEXT_STATUS: Partial<Record<RideStatus, RideStatus[]>> = {
  REQUESTED: ["CANCELLED"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["ONGOING", "CANCELLED"],
  ONGOING: ["COMPLETED"],
};

export default function AdminCabRideDetailPage() {
  return (
    <RequirePermission permission="manage_rides">
      <RideDetailContent />
    </RequirePermission>
  );
}

function RideDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setError(null);
    try {
      setRide(await api.get<Ride>(`/admin/cab/rides/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load ride.");
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("admin:subscribe");
    const handler = (payload: { rideId?: string; orderId?: string }) => {
      if (payload.rideId === id || payload.orderId === id) load();
    };
    socket.on("order:update", handler);
    const poll = setInterval(load, 6000);
    return () => {
      socket.off("order:update", handler);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status: RideStatus) {
    setUpdating(true);
    try {
      await api.patch(`/admin/cab/rides/${id}/status`, { status });
      show(`Ride marked ${status.replace(/_/g, " ").toLowerCase()}`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update status.", "error");
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!ride) return <div className="h-40 skeleton" />;

  const nextOptions = NEXT_STATUS[ride.status] ?? [];
  const markers: MapMarker[] = [
    { lat: ride.pickupLat, lng: ride.pickupLng, kind: "pickup", color: "#0EA36C" },
    { lat: ride.dropLat, lng: ride.dropLng, kind: "drop", color: "#E40014" },
  ];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Ride #{ride.rideNumber}</h1>
        <RideStatusBadge status={ride.status} />
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        {ride.user?.name ?? ride.user?.email} · {ride.rideType?.name}
        {ride.driver && ` · Driver: ${ride.driver.name}`}
      </p>

      {nextOptions.length > 0 && (
        <div className="card-glido p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm">Update status</h3>
          <div className="flex gap-2 flex-wrap">
            {nextOptions.map((s) => (
              <button
                key={s}
                disabled={updating}
                onClick={() => setStatus(s)}
                className={s === "CANCELLED" ? "btn-danger-outline" : "btn-primary"}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <MapView center={{ lat: ride.pickupLat, lng: ride.pickupLng }} markers={markers} polyline={markers} height="280px" />
      </div>

      <div className="card-glido p-4 mb-4">
        <RideTimeline status={ride.status} />
      </div>

      <div className="card-glido p-4 text-sm">
        <h3 className="font-semibold mb-2">Trip & fare</h3>
        <p className="text-[var(--glido-muted)]">{ride.pickupAddress}</p>
        <p className="text-[var(--glido-muted)] mt-1">→ {ride.dropAddress}</p>
        <div className="flex justify-between font-bold pt-3 mt-3 border-t border-[var(--glido-border)]">
          <span>{ride.distanceKm} km</span>
          <span>₹{(ride.finalFare ?? ride.estimatedFare).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
