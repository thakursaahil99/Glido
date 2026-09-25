"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Order, Paginated } from "@/lib/types";
import { StatusBadge } from "@/components/order-status";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

const STATUS_TABS = ["ALL", "PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;

export default function AdminOrdersPage() {
  return (
    <RequirePermission permission="manage_orders">
      <OrdersContent />
    </RequirePermission>
  );
}

function OrdersContent() {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<Order>>(
        `/admin/orders?pageSize=50${status !== "ALL" ? `&status=${status}` : ""}`,
      );
      setOrders(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load orders.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${
              status === tab ? "bg-[var(--glido-primary)] text-white" : "bg-white dark:bg-[var(--glido-surface)] border border-[var(--glido-border)] text-[var(--glido-muted)]"
            }`}
          >
            {tab.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && orders === null && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 skeleton" />
          ))}
        </div>
      )}

      {!error && orders && orders.length === 0 && <EmptyState icon={Package} title="No orders in this status" />}

      {!error && orders && orders.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Order</th>
                <th className="py-2.5 px-4">Restaurant</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Payment</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-[var(--glido-primary)]">
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4">{o.restaurant?.name}</td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-2.5 px-4">{o.paymentMethod} · {o.paymentStatus}</td>
                  <td className="py-2.5 px-4">₹{o.totalAmount.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-[var(--glido-muted)]">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
