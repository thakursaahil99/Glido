"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock, Package } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import type { GroceryOrder, Order, Paginated } from "@/lib/types";
import { StatusBadge } from "@/components/order-status";
import { EmptyState, ErrorState } from "@/components/empty-state";

const STATUS_TABS = ["ALL", "PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;

type UnifiedRow = {
  id: string;
  kind: "Food" | "Grocery";
  orderNumber: string;
  customer: string;
  status: Order["status"];
  amount: number;
  createdAt: string;
  href: string;
};

/** Merges Food + Grocery orders into a single, read-only list so admin doesn't have
 * to check two separate sections to see everything a customer has placed. Detail,
 * status changes and delivery-partner assignment still happen on each order's own
 * existing admin page (linked from here) — this view is purely a combined index. */
export default function AdminAllOrdersPage() {
  const { user } = useAuth();
  const canFood = hasPermission(user, "manage_orders");
  const canGrocery = hasPermission(user, "manage_grocery");

  if (!canFood && !canGrocery) {
    return (
      <EmptyState
        icon={Lock}
        title="You don't have access to this"
        description="Ask a Super Admin to grant you the required permission from Admin → Staff."
      />
    );
  }

  return <AllOrdersContent canFood={canFood} canGrocery={canGrocery} />;
}

function AllOrdersContent({ canFood, canGrocery }: { canFood: boolean; canGrocery: boolean }) {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [rows, setRows] = useState<UnifiedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const qs = status !== "ALL" ? `&status=${status}` : "";
      const [foodRes, groceryRes] = await Promise.all([
        canFood ? api.get<Paginated<Order>>(`/admin/orders?pageSize=50${qs}`) : Promise.resolve<Paginated<Order>>({ items: [], total: 0, page: 1, pageSize: 50 }),
        canGrocery ? api.get<Paginated<GroceryOrder>>(`/admin/grocery/orders?pageSize=50${qs}`) : Promise.resolve<Paginated<GroceryOrder>>({ items: [], total: 0, page: 1, pageSize: 50 }),
      ]);

      const foodRows: UnifiedRow[] = foodRes.items.map((o) => ({
        id: o.id,
        kind: "Food",
        orderNumber: o.orderNumber,
        customer: o.user?.name ?? o.user?.email ?? o.restaurant?.name ?? "—",
        status: o.status,
        amount: o.totalAmount,
        createdAt: o.createdAt,
        href: `/admin/orders/${o.id}`,
      }));
      const groceryRows: UnifiedRow[] = groceryRes.items.map((o) => ({
        id: o.id,
        kind: "Grocery",
        orderNumber: o.orderNumber,
        customer: o.user?.name ?? o.user?.email ?? "—",
        status: o.status,
        amount: o.totalAmount,
        createdAt: o.createdAt,
        href: `/admin/grocery/orders/${o.id}`,
      }));

      setRows([...foodRows, ...groceryRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
      <h1 className="text-2xl font-bold mb-1">All Orders</h1>
      <p className="text-sm text-[var(--glido-muted)] mb-6">Food and grocery orders together — a customer who orders both sees two rows here, one per order, since they're billed and fulfilled separately.</p>

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

      {!error && rows === null && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 skeleton" />
          ))}
        </div>
      )}

      {!error && rows && rows.length === 0 && <EmptyState icon={Package} title="No orders in this status" />}

      {!error && rows && rows.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Order</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Placed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <Link href={r.href} className="font-medium text-[var(--glido-primary)]">
                      #{r.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${r.kind === "Food" ? "badge-nonveg" : "badge-veg"}`}>{r.kind}</span>
                  </td>
                  <td className="py-2.5 px-4">{r.customer}</td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 px-4">₹{r.amount.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-[var(--glido-muted)]">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
