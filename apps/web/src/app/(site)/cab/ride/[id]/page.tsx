"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import { ArrowLeft, Phone, Star } from "lucide-react";
import type { Ride } from "@/lib/types";
import { RideStatusBadge, RideTimeline } from "@/components/ride-status";
import { MapView, type MapMarker } from "@/components/map-view";
import { ConfirmDialog } from "@/components/modal";
import { ErrorState } from "@/components/empty-state";

export default function RideTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  async function load() {
    setError(null);
    try {
      setRide(await api.get<Ride>(`/cab/rides/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this ride.");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/cab/ride/${id}`);
      return;
    }
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, id]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("order:subscribe", id);
    const handler = (payload: { rideId?: string; orderId?: string }) => {
      if (payload.rideId === id || payload.orderId === id) load();
    };
    socket.on("order:update", handler);
    // Polling fallback — the live serverless API doesn't hold a persistent
    // socket connection, so push updates aren't guaranteed; poll while the ride is active.
    const poll = setInterval(load, 6000);
    return () => {
      socket.off("order:update", handler);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancelRide() {
    try {
      await api.post(`/cab/rides/${id}/cancel`, {});
      show("Ride cancelled.", "success");
      setCancelOpen(false);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not cancel ride.", "error");
    }
  }

  async function submitReview() {
    setSubmittingReview(true);
    try {
      await api.post(`/cab/rides/${id}/review`, { rating: reviewRating, comment: reviewComment || undefined });
      show("Thanks for rating your ride!", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not submit rating.", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!ride) {
    return (
      <div className="container-glido py-8 space-y-3 max-w-2xl">
        <div className="h-6 w-1/2 skeleton" />
        <div className="h-64 skeleton" />
      </div>
    );
  }

  const canCancel = ride.status === "REQUESTED" || ride.status === "DRIVER_ASSIGNED";
  const markers: MapMarker[] = [
    { lat: ride.pickupLat, lng: ride.pickupLng, kind: "pickup", color: "#0EA36C" },
    { lat: ride.dropLat, lng: ride.dropLng, kind: "drop", color: "#E40014" },
    ...(ride.driver?.currentLat != null && ride.driver?.currentLng != null
      ? [{ lat: ride.driver.currentLat, lng: ride.driver.currentLng, kind: "driver" as const, color: "#101418" }]
      : []),
  ];

  return (
    <div>
      <div className="relative">
        <MapView
          center={{ lat: ride.pickupLat, lng: ride.pickupLng }}
          markers={markers}
          polyline={[{ lat: ride.pickupLat, lng: ride.pickupLng }, { lat: ride.dropLat, lng: ride.dropLng }]}
          height="38vh"
        />
        <button
          onClick={() => router.push("/cab/rides")}
          aria-label="Back to your rides"
          className="absolute top-3 left-3 h-10 w-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50"
        >
          <ArrowLeft size={18} className="text-[var(--glido-ink)]" />
        </button>
      </div>

      <div className="container-glido py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Ride #{ride.rideNumber}</h1>
          <RideStatusBadge status={ride.status} />
        </div>
        <p className="text-sm text-[var(--glido-muted)] mb-6">{ride.rideType?.name}</p>

        {ride.driver && (
          <div className="card-glido p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{ride.driver.name}</p>
              <p className="text-xs text-[var(--glido-muted)]">
                {ride.driver.vehicleModel} · {ride.driver.vehicleNumber}
              </p>
              <p className="text-xs text-[var(--glido-muted)] mt-0.5">★ {ride.driver.ratingAvg.toFixed(1)}</p>
            </div>
            <a href={`tel:${ride.driver.phone}`} className="btn-secondary text-sm !py-2 flex items-center gap-1.5">
              <Phone size={14} /> Call
            </a>
          </div>
        )}

        <div className="card-glido p-4 mb-4">
          <RideTimeline status={ride.status} />
        </div>

        {canCancel && (
          <button onClick={() => setCancelOpen(true)} className="btn-danger-outline mb-4">
            Cancel ride
          </button>
        )}

        <div className="card-glido p-4 mb-4 text-sm">
          <h3 className="font-semibold mb-2">Trip details</h3>
          <div className="flex gap-2.5 mb-2 items-start">
            <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-1" style={{ background: "#0EA36C" }} />
            <span className="text-[var(--glido-muted)]">{ride.pickupAddress}</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="h-2.5 w-2.5 shrink-0 mt-1 rotate-45" style={{ background: "#E40014" }} />
            <span className="text-[var(--glido-muted)]">{ride.dropAddress}</span>
          </div>
        </div>

        <div className="card-glido p-4 text-sm">
          <h3 className="font-semibold mb-2">Fare</h3>
          <div className="flex justify-between">
            <span className="text-[var(--glido-muted)]">Distance</span>
            <span>{ride.distanceKm} km</span>
          </div>
          <div className="flex justify-between font-bold pt-2 mt-2 border-t border-[var(--glido-border)]">
            <span>{ride.status === "COMPLETED" ? "Total fare" : "Estimated fare"}</span>
            <span>₹{(ride.finalFare ?? ride.estimatedFare).toFixed(2)}</span>
          </div>
          <p className="text-xs text-[var(--glido-muted)] mt-2">Pay the driver in cash at the end of your ride.</p>
        </div>

        {ride.status === "COMPLETED" && ride.driver && !ride.review && (
          <div className="card-glido p-4 mt-4">
            <h3 className="font-semibold mb-2">Rate your driver</h3>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReviewRating(n)}>
                  <Star
                    size={26}
                    className={n <= reviewRating ? "text-[var(--glido-accent)] fill-[var(--glido-accent)]" : "text-gray-300"}
                  />
                </button>
              ))}
            </div>
            <textarea
              className="input-glido"
              rows={2}
              placeholder={`How was your ride with ${ride.driver.name}? (optional)`}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            <button onClick={submitReview} disabled={submittingReview} className="btn-primary mt-2">
              {submittingReview ? "Submitting..." : "Submit rating"}
            </button>
          </div>
        )}
        {ride.review && (
          <div className="card-glido p-4 mt-4 text-sm">
            <p className="font-semibold flex items-center gap-2">
              Your rating:
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={i < ride.review!.rating ? "text-[var(--glido-accent)] fill-[var(--glido-accent)]" : "text-gray-300"}
                  />
                ))}
              </span>
            </p>
            {ride.review.comment && <p className="text-[var(--glido-muted)] mt-1">{ride.review.comment}</p>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this ride?"
        description="This can't be undone."
        confirmLabel="Yes, cancel ride"
        danger
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancelRide}
      />
    </div>
  );
}
