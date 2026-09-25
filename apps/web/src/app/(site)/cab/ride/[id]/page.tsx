"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck, Star } from "lucide-react";
import type { Ride } from "@/lib/types";
import { RideStatusBadge, RideTimeline } from "@/components/ride-status";
import { MapView, type MapMarker } from "@/components/map-view";
import { ConfirmDialog, Modal } from "@/components/modal";
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
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipOpen, setCustomTipOpen] = useState(false);
  const [customTip, setCustomTip] = useState("");
  const [submittingTip, setSubmittingTip] = useState(false);

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

  const REVIEW_TAGS = ["Clean car", "Polite & professional", "Smooth driving", "Followed route", "Safe driving"];
  function toggleReviewTag(tag: string) {
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function submitReview() {
    setSubmittingReview(true);
    try {
      const comment = [...reviewTags, reviewComment.trim()].filter(Boolean).join(", ") || undefined;
      await api.post(`/cab/rides/${id}/review`, { rating: reviewRating, comment });
      show("Thanks for rating your ride!", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not submit rating.", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function submitTip(amount: number) {
    setSubmittingTip(true);
    try {
      await api.post(`/cab/rides/${id}/tip`, { amount });
      show(`Thanks! ₹${amount} tip sent to your driver.`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not send tip.", "error");
    } finally {
      setSubmittingTip(false);
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
  const totalFare = (ride.finalFare ?? ride.estimatedFare) + ride.tipAmount;
  const baseFare = ride.rideType?.baseFare ?? 0;
  const distanceFare = (ride.rideType?.perKmFare ?? 0) * ride.distanceKm;
  const otherCharges = Math.max(0, (ride.finalFare ?? ride.estimatedFare) - baseFare - distanceFare);
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
          className="absolute top-3 left-3 h-10 w-10 rounded-full bg-white dark:bg-[var(--glido-surface)] shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)]"
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
          <div className="card-glido p-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold text-lg"
                style={{ background: "var(--glido-cab)" }}
              >
                {ride.driver.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ride.driver.photoUrl} alt={ride.driver.name} className="h-full w-full object-cover" />
                ) : (
                  ride.driver.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ride.driver.name}</p>
                <p className="text-xs text-[var(--glido-muted)] truncate">
                  {ride.driver.vehicleModel} · {ride.driver.vehicleNumber}
                </p>
                <p className="text-xs text-[var(--glido-muted)] mt-0.5 flex items-center gap-0.5">
                  <Star size={11} className="text-[var(--glido-accent)] fill-[var(--glido-accent)]" /> {ride.driver.ratingAvg.toFixed(1)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <a href={`tel:${ride.driver.phone}`} className="btn-secondary text-sm !py-2 flex items-center justify-center gap-1.5">
                <Phone size={14} /> Call
              </a>
              <a href={`sms:${ride.driver.phone}`} className="btn-secondary text-sm !py-2 flex items-center justify-center gap-1.5">
                <MessageCircle size={14} /> Message
              </a>
              <button onClick={() => setSafetyOpen(true)} className="btn-secondary text-sm !py-2 flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} /> Safety
              </button>
            </div>
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
          <h3 className="font-semibold mb-2">{ride.status === "COMPLETED" ? "Fare receipt" : "Fare"}</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Base fare</span><span>₹{baseFare.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Distance & time ({ride.distanceKm} km)</span><span>₹{distanceFare.toFixed(2)}</span></div>
            {otherCharges > 0 && (
              <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Taxes & fees</span><span>₹{otherCharges.toFixed(2)}</span></div>
            )}
            {ride.tipAmount > 0 && (
              <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Driver tip</span><span>₹{ride.tipAmount.toFixed(2)}</span></div>
            )}
          </div>
          <div className="flex justify-between font-bold pt-2 mt-2 border-t border-[var(--glido-border)]">
            <span>{ride.status === "COMPLETED" ? "Total paid" : "Estimated fare"}</span>
            <span>₹{totalFare.toFixed(2)}</span>
          </div>
          <p className="text-xs text-[var(--glido-muted)] mt-2">
            {ride.paymentMethod === "WALLET" ? "Paid from Glido Wallet." : "Pay the driver in cash at the end of your ride."}
          </p>
        </div>

        {ride.status === "COMPLETED" && ride.driver && ride.tipAmount === 0 && (
          <div className="card-glido p-4 mt-4">
            <h3 className="font-semibold mb-1">Add a tip for {ride.driver.name}</h3>
            <p className="text-xs text-[var(--glido-muted)] mb-3">100% goes to your driver. Totally optional.</p>
            <div className="flex flex-wrap gap-2">
              {[20, 30, 50].map((amount) => (
                <button
                  key={amount}
                  onClick={() => { setTipAmount(amount); setCustomTipOpen(false); }}
                  className="px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors"
                  style={
                    tipAmount === amount
                      ? { background: "var(--glido-cab)", borderColor: "var(--glido-cab)", color: "white" }
                      : { borderColor: "var(--glido-border)", color: "var(--glido-ink)" }
                  }
                >
                  +₹{amount}
                </button>
              ))}
              <button
                onClick={() => setCustomTipOpen((v) => !v)}
                className="px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors"
                style={
                  customTipOpen || (tipAmount > 0 && ![20, 30, 50].includes(tipAmount))
                    ? { background: "var(--glido-cab)", borderColor: "var(--glido-cab)", color: "white" }
                    : { borderColor: "var(--glido-border)", color: "var(--glido-ink)" }
                }
              >
                Custom
              </button>
            </div>
            {customTipOpen && (
              <input
                className="input-glido mt-3"
                type="number"
                min={1}
                placeholder="Enter amount"
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  const n = Number(e.target.value);
                  setTipAmount(Number.isFinite(n) && n > 0 ? n : 0);
                }}
              />
            )}
            <button
              onClick={() => submitTip(tipAmount)}
              disabled={submittingTip || tipAmount <= 0}
              className="btn-primary w-full mt-3 disabled:opacity-50"
            >
              {submittingTip ? "Sending..." : tipAmount > 0 ? `Send ₹${tipAmount} tip` : "Choose a tip amount"}
            </button>
          </div>
        )}

        {ride.status === "COMPLETED" && ride.driver && !ride.review && (
          <div className="card-glido p-4 mt-4">
            <h3 className="font-semibold mb-2">Rate your driver</h3>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReviewRating(n)}>
                  <Star
                    size={26}
                    className={n <= reviewRating ? "text-[var(--glido-accent)] fill-[var(--glido-accent)]" : "text-gray-300 dark:text-[var(--glido-border)]"}
                  />
                </button>
              ))}
            </div>
            {reviewRating >= 4 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {REVIEW_TAGS.map((tag) => {
                  const active = reviewTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleReviewTag(tag)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                      style={
                        active
                          ? { background: "var(--glido-cab-light)", borderColor: "var(--glido-cab)", color: "var(--glido-cab-dark)" }
                          : { borderColor: "var(--glido-border)", color: "var(--glido-muted)" }
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
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
                    className={i < ride.review!.rating ? "text-[var(--glido-accent)] fill-[var(--glido-accent)]" : "text-gray-300 dark:text-[var(--glido-border)]"}
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

      {ride.driver && (
        <Modal open={safetyOpen} title="Trip safety" onClose={() => setSafetyOpen(false)}>
          <div className="space-y-3 text-sm">
            <p className="text-[var(--glido-muted)]">
              Share these details with someone you trust, or call emergency services if you ever feel unsafe.
            </p>
            <div className="card-glido p-3 text-xs space-y-1">
              <p><span className="text-[var(--glido-muted)]">Driver:</span> {ride.driver.name} · ★ {ride.driver.ratingAvg.toFixed(1)}</p>
              <p><span className="text-[var(--glido-muted)]">Vehicle:</span> {ride.driver.vehicleModel} · {ride.driver.vehicleNumber}</p>
              <p><span className="text-[var(--glido-muted)]">From:</span> {ride.pickupAddress}</p>
              <p><span className="text-[var(--glido-muted)]">To:</span> {ride.dropAddress}</p>
            </div>
            <button
              onClick={() => {
                const text = `Tracking my Glido ride: driver ${ride.driver!.name} (${ride.driver!.vehicleModel} · ${ride.driver!.vehicleNumber}), from ${ride.pickupAddress} to ${ride.dropAddress}.`;
                navigator.clipboard?.writeText(text).then(
                  () => show("Trip details copied — paste them to share.", "success"),
                  () => show("Could not copy. Please share the details manually.", "error"),
                );
              }}
              className="btn-secondary w-full text-sm"
            >
              Copy trip details to share
            </button>
            <a href="tel:112" className="btn-danger-outline w-full text-center block">
              Call emergency services (112)
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
