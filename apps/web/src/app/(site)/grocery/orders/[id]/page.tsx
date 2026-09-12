"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import { ArrowLeft, Phone, ShoppingCart } from "lucide-react";
import type { GroceryOrder } from "@/lib/types";
import { OrderTimeline, StatusBadge } from "@/components/order-status";
import { ConfirmDialog } from "@/components/modal";
import { ErrorState } from "@/components/empty-state";

export default function GroceryOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [order, setOrder] = useState<GroceryOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function load() {
    setError(null);
    try {
      setOrder(await api.get<GroceryOrder>(`/grocery/orders/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this order.");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/grocery/orders/${id}`);
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
    return () => {
      socket.off("order:update", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancelOrder() {
    try {
      await api.post(`/grocery/orders/${id}/cancel`, {});
      show("Order cancelled.", "success");
      setCancelOpen(false);
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not cancel order.", "error");
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
        onClick={() => router.push("/grocery/orders")}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--glido-muted)] hover:text-[var(--glido-primary)] mb-4"
      >
        <ArrowLeft size={16} /> Back to orders
      </button>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">Glido Grocery</p>

      {order.deliveryPartner && ["READY", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && (
        <div className="card-glido p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--glido-muted)]">Delivery partner</p>
            <p className="font-semibold">{order.deliveryPartner.name}</p>
            <p className="text-xs text-[var(--glido-muted)]">
              {order.deliveryPartner.vehicleType} · ★ {order.deliveryPartner.ratingAvg.toFixed(1)}
            </p>
          </div>
          <a href={`tel:${order.deliveryPartner.phone}`} className="btn-secondary text-sm !py-2 flex items-center gap-1.5">
            <Phone size={14} /> Call
          </a>
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

      <div className="card-glido p-4 mb-4">
        <h3 className="font-semibold mb-2">Items</h3>
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {resolveMediaUrl(item.product?.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.product?.imageUrl)} alt={item.nameSnapshot} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingCart size={14} className="text-gray-300" />
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
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Tax</span><span>₹{order.taxAmount.toFixed(2)}</span></div>
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
          Payment: {order.paymentMethod === "WALLET" ? "Glido Wallet" : "Cash on delivery"} · {order.paymentStatus}
        </p>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this order?"
        description="This can't be undone."
        confirmLabel="Yes, cancel order"
        danger
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancelOrder}
      />
    </div>
  );
}
