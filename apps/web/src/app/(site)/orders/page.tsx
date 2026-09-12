"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order, Paginated } from "@/lib/types";
import { StatusBadge } from "@/components/order-status";
import { EmptyState, ErrorState } from "@/components/empty-state";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<Order>>("/orders/me?pageSize=30");
      setOrders(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your orders.");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/orders");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="container-glido py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Your orders</h1>

      {orders === null && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 skeleton" />
          ))}
        </div>
      )}

      {orders && orders.length === 0 && (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order, it'll show up here."
          action={
            <Link href="/food" className="btn-primary">
              Order food
            </Link>
          }
        />
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="card-glido p-4 block hover:border-[var(--glido-primary)]">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{o.restaurant?.name ?? "Order"}</p>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex items-center justify-between mt-2 text-sm text-[var(--glido-muted)]">
                <span>#{o.orderNumber} · {new Date(o.createdAt).toLocaleString()}</span>
                <span className="font-semibold text-[var(--glido-ink)]">₹{o.totalAmount.toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
