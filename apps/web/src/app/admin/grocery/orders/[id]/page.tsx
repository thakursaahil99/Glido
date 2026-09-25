"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, ShoppingCart } from "lucide-react";
import { api, ApiError, downloadFile, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { getSocket } from "@/lib/socket";
import type { OrderStatus } from "@glido/shared";
import type { GroceryOrder } from "@/lib/types";
import { OrderTimeline, StatusBadge } from "@/components/order-status";
import { AssignPartnerPanel } from "@/components/assign-partner-panel";
import { ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

export default function AdminGroceryOrderDetailPage() {
  return (
    <RequirePermission permission="manage_grocery">
      <OrderDetailContent />
    </RequirePermission>
  );
}

function OrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [order, setOrder] = useState<GroceryOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  async function load() {
    setError(null);
    try {
      setOrder(await api.get<GroceryOrder>(`/admin/grocery/orders/${id}`));
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
    socket.emit("admin:subscribe");
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

  async function setStatus(newStatus: OrderStatus) {
    setUpdating(true);
    try {
      await api.patch(`/admin/grocery/orders/${id}/status`, { status: newStatus });
      show(`Order marked ${newStatus.replace(/_/g, " ").toLowerCase()}`, "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update status.", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function downloadInvoice() {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      await downloadFile(`/admin/grocery/orders/${order.id}/invoice.pdf`, `invoice-${order.orderNumber}.pdf`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not download invoice.", "error");
    } finally {
      setDownloadingInvoice(false);
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
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[var(--glido-muted)]">{order.user?.name ?? order.user?.email}</p>
        <button onClick={downloadInvoice} disabled={downloadingInvoice} className="btn-secondary text-sm !py-1.5 flex items-center gap-1.5">
          <Download size={14} /> {downloadingInvoice ? "Preparing..." : "Download invoice"}
        </button>
      </div>

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

      <AssignPartnerPanel
        currentPartner={order.deliveryPartner}
        assignPath={`/admin/grocery/orders/${id}/assign-partner`}
        onAssigned={load}
        readOnly={order.status === "DELIVERED" || order.status === "CANCELLED" || order.status === "REFUNDED"}
        acceptanceStatus={order.deliveryAcceptanceStatus}
      />

      <div className="card-glido p-4 mb-4 text-sm">
        <h3 className="font-semibold mb-2">Items</h3>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-[var(--glido-surface-alt)] overflow-hidden shrink-0">
                {resolveMediaUrl(item.product?.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.product?.imageUrl)} alt={item.nameSnapshot} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingCart size={14} className="text-gray-300" />
                  </div>
                )}
              </div>
              <span className="flex-1">{item.quantity} × {item.nameSnapshot}</span>
              <span>₹{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
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
