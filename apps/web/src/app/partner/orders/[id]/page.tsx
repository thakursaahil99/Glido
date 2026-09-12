"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import type { OrderStatus } from "@glido/shared";
import type { Order as OrderType } from "@/lib/types";
import { OrderTimeline, StatusBadge } from "@/components/order-status";
import { ErrorState } from "@/components/empty-state";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

export default function PartnerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [order, setOrder] = useState<OrderType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function load() {
    setError(null);
    try {
      setOrder(await api.get<OrderType>(`/partner/orders/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load order.");
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  async function setStatus(newStatus: OrderStatus) {
    setUpdating(true);
    try {
      await api.patch(`/partner/orders/${id}/status`, { status: newStatus });
      show(`Order marked ${newStatus.replace(/_/g, " ").toLowerCase()}`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update status.", "error");
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <div className="h-40 skeleton" />;

  const nextOptions = NEXT_STATUS[order.status] ?? [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">₹{order.totalAmount.toFixed(2)}</p>

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

      <div className="card-glido p-4 mb-4">
        <OrderTimeline status={order.status} />
      </div>

      {order.deliveryPartner && (
        <div className="card-glido p-4 mb-4 text-sm">
          <h3 className="font-semibold mb-2">Delivery partner</h3>
          <p>{order.deliveryPartner.name} · {order.deliveryPartner.phone}</p>
          <p className="text-[var(--glido-muted)]">{order.deliveryPartner.vehicleType}</p>
        </div>
      )}

      <div className="card-glido p-4 mb-4 text-sm">
        <h3 className="font-semibold mb-2">Items</h3>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1">
            <span>{item.quantity} × {item.nameSnapshot}</span>
            <span>₹{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold pt-2 mt-2 border-t border-[var(--glido-border)]">
          <span>Total</span>
          <span>₹{order.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="card-glido p-4 text-sm">
        <h3 className="font-semibold mb-2">Delivery address</h3>
        <p>{order.address?.line1}{order.address?.line2 ? `, ${order.address.line2}` : ""}</p>
        {order.deliveryInstructions && <p className="text-[var(--glido-muted)] mt-1">Note: {order.deliveryInstructions}</p>}
      </div>
    </div>
  );
}
