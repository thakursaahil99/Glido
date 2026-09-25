"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import { ArrowLeft, MessageCircle, Phone, Star, UtensilsCrossed } from "lucide-react";
import type { Order } from "@/lib/types";
import { OrderTimeline, StatusBadge } from "@/components/order-status";
import { ConfirmDialog } from "@/components/modal";
import { ErrorState } from "@/components/empty-state";
import { MapView, type MapMarker } from "@/components/map-view";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Order>(`/orders/${id}`);
      setOrder(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this order.");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/orders/${id}`);
      return;
    }
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, id]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("order:subscribe", id);
    const handler = (payload: { orderId: string }) => {
      if (payload.orderId === id) load();
    };
    socket.on("order:update", handler);
    const poll = setInterval(load, 6000);
    return () => {
      socket.off("order:update", handler);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancelOrder() {
    setCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`, {});
      show("Order cancelled.", "success");
      setCancelOpen(false);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not cancel order.", "error");
    } finally {
      setCancelling(false);
    }
  }

  async function submitReview() {
    setSubmittingReview(true);
    try {
      await api.post(`/orders/${id}/review`, { rating: reviewRating, comment: reviewComment || undefined });
      show("Thanks for your review!", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not submit review.", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) {
    return (
      <div className="container-glido py-8 space-y-3 max-w-2xl">
        <div className="h-6 w-1/2 skeleton" />
        <div className="h-40 skeleton" />
      </div>
    );
  }

  const canCancel = order.status === "PENDING" || order.status === "ACCEPTED";

  return (
    <div className="container-glido py-8 max-w-2xl">
      <button
        onClick={() => router.push("/orders")}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--glido-muted)] hover:text-[var(--glido-primary)] mb-4"
      >
        <ArrowLeft size={16} /> Back to orders
      </button>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">{order.restaurant?.name}</p>

      {order.deliveryPartner && order.status === "OUT_FOR_DELIVERY" && order.deliveryPartner.currentLat != null && order.deliveryPartner.currentLng != null && (
        <div className="card-glido overflow-hidden mb-4">
          <MapView
            center={{ lat: order.deliveryPartner.currentLat, lng: order.deliveryPartner.currentLng }}
            zoom={15}
            markers={[{ lat: order.deliveryPartner.currentLat, lng: order.deliveryPartner.currentLng, kind: "driver" as const, color: "var(--glido-food)" } as MapMarker]}
            height="220px"
            className="!rounded-none"
          />
        </div>
      )}

      {order.deliveryPartner && ["READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && (
        <div className="card-glido p-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "var(--glido-food)" }}
            >
              {order.deliveryPartner.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.deliveryPartner.photoUrl} alt={order.deliveryPartner.name} className="h-full w-full object-cover" />
              ) : (
                order.deliveryPartner.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--glido-muted)]">Delivery partner</p>
              <p className="font-semibold truncate">{order.deliveryPartner.name}</p>
              <p className="text-xs text-[var(--glido-muted)]">
                {order.deliveryPartner.vehicleType} · ★ {order.deliveryPartner.ratingAvg.toFixed(1)}
              </p>
            </div>
          </div>
          {order.status === "OUT_FOR_DELIVERY" && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <a href={`tel:${order.deliveryPartner.phone}`} className="btn-secondary text-sm !py-2 flex items-center justify-center gap-1.5">
                <Phone size={14} /> Call
              </a>
              <a href={`sms:${order.deliveryPartner.phone}`} className="btn-secondary text-sm !py-2 flex items-center justify-center gap-1.5">
                <MessageCircle size={14} /> Message
              </a>
            </div>
          )}
        </div>
      )}

      <div className="card-glido p-4 mb-4">
        <OrderTimeline status={order.status} />
      </div>

      {canCancel && (
        <button onClick={() => setCancelOpen(true)} className="btn-danger-outline mb-4">
          Cancel order
        </button>
      )}

      {order.status === "DELIVERED" && !order.review && (
        <div className="card-glido p-4 mb-4">
          <h3 className="font-semibold mb-2">Rate this order</h3>
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
          <textarea
            className="input-glido"
            rows={2}
            placeholder="How was your order? (optional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <button onClick={submitReview} disabled={submittingReview} className="btn-primary mt-2">
            {submittingReview ? "Submitting..." : "Submit review"}
          </button>
        </div>
      )}
      {order.review && (
        <div className="card-glido p-4 mb-4 text-sm">
          <p className="font-semibold flex items-center gap-2">
            Your review:
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={15}
                  className={i < order.review!.rating ? "text-[var(--glido-accent)] fill-[var(--glido-accent)]" : "text-gray-300 dark:text-[var(--glido-border)]"}
                />
              ))}
            </span>
          </p>
          {order.review.comment && <p className="text-[var(--glido-muted)] mt-1">{order.review.comment}</p>}
        </div>
      )}

      <div className="card-glido p-4 mb-4">
        <h3 className="font-semibold mb-2">Items</h3>
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-[var(--glido-surface-alt)] overflow-hidden shrink-0">
                {resolveMediaUrl(item.menuItem?.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.menuItem?.imageUrl)} alt={item.nameSnapshot} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <UtensilsCrossed size={14} className="text-gray-300" />
                  </div>
                )}
              </div>
              <span className="flex-1">
                {item.quantity} × {item.nameSnapshot}
              </span>
              <span>₹{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--glido-border)] mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Delivery fee</span><span>₹{order.deliveryFee.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Packaging fee</span><span>₹{order.packagingFee.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Tax</span><span>₹{order.taxAmount.toFixed(2)}</span></div>
          {order.tipAmount > 0 && (
            <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Delivery tip</span><span>₹{order.tipAmount.toFixed(2)}</span></div>
          )}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[var(--glido-primary-dark)]"><span>Discount</span><span>−₹{order.discountAmount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between font-bold pt-1"><span>Total</span><span>₹{order.totalAmount.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="card-glido p-4 text-sm">
        <h3 className="font-semibold mb-2">Delivery details</h3>
        <p>{order.address?.line1}{order.address?.line2 ? `, ${order.address.line2}` : ""}</p>
        {order.deliveryInstructions && <p className="text-[var(--glido-muted)] mt-1">Note: {order.deliveryInstructions}</p>}
        <p className="mt-2 text-[var(--glido-muted)]">
          Payment: {order.paymentMethod} · {order.paymentStatus}
        </p>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this order?"
        description="This can't be undone. If you already paid online, a refund will be issued."
        confirmLabel="Yes, cancel order"
        danger
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancelOrder}
        confirming={cancelling}
      />
    </div>
  );
}
