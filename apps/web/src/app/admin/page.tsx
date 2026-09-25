"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  IndianRupee,
  Package,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/order-status";
import { ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

interface DashboardData {
  totalUsers: number;
  totalRestaurants: number;
  pendingRestaurants: number;
  totalOrders: number;
  ordersToday: number;
  revenue: number;
  ordersByStatus: Record<string, number>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    restaurant: { name: string };
    user: { name: string | null; email: string | null };
  }>;
}

export default function AdminDashboardPage() {
  return (
    <RequirePermission permission="view_dashboard">
      <DashboardContent />
    </RequirePermission>
  );
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setData(await api.get<DashboardData>("/admin/dashboard"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load dashboard.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 skeleton" />
        ))}
      </div>
    );
  }

  const stats: { label: string; value: string | number; icon: LucideIcon; tone: "primary" | "success" | "accent" }[] = [
    { label: "Total customers", value: data.totalUsers, icon: Users, tone: "primary" },
    { label: "Restaurants", value: data.totalRestaurants, icon: UtensilsCrossed, tone: "primary" },
    { label: "Total orders", value: data.totalOrders, icon: Package, tone: "primary" },
    { label: "Orders today", value: data.ordersToday, icon: CalendarClock, tone: "success" },
    { label: "Revenue (paid orders)", value: `₹${data.revenue.toFixed(2)}`, icon: IndianRupee, tone: "success" },
    { label: "Pending approvals", value: data.pendingRestaurants, icon: AlertCircle, tone: "accent" },
  ];

  const toneClasses: Record<string, string> = {
    primary: "bg-[var(--glido-primary-light)] text-[var(--glido-primary-dark)]",
    success: "bg-[var(--glido-success-light)] text-[var(--glido-success)]",
    accent: "bg-[var(--glido-accent-light)] text-[var(--glido-accent)]",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-[var(--glido-muted)] mb-6">A live snapshot of everything happening on Glido right now.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-glido p-4">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${toneClasses[s.tone]}`}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <p className="text-2xl font-bold leading-tight">{s.value}</p>
              <p className="text-xs text-[var(--glido-muted)] mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {data.pendingRestaurants > 0 && (
        <Link
          href="/admin/restaurants?status=PENDING"
          className="card-glido p-4 mb-8 flex items-center justify-between border-[var(--glido-accent)] bg-[var(--glido-accent-light)]"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <AlertCircle size={18} className="text-[var(--glido-accent)]" />
            {data.pendingRestaurants} restaurant{data.pendingRestaurants > 1 ? "s" : ""} waiting for approval
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-[var(--glido-accent)]">
            Review <ArrowUpRight size={15} />
          </span>
        </Link>
      )}

      <div className="card-glido p-4 mb-8">
        <h2 className="font-semibold mb-3">Orders by status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.ordersByStatus).map(([status, count]) => (
            <div key={status} className="badge badge-status">
              {status.replace(/_/g, " ")}: {count}
            </div>
          ))}
          {Object.keys(data.ordersByStatus).length === 0 && (
            <p className="text-sm text-[var(--glido-muted)]">No orders yet.</p>
          )}
        </div>
      </div>

      <div className="card-glido overflow-hidden">
        <h2 className="font-semibold p-4 pb-0">Recent orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Order</th>
                <th className="py-2.5 px-4">Restaurant</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--glido-border)] last:border-0 hover:bg-gray-50/60 dark:hover:bg-[var(--glido-surface-alt)]/60">
                  <td className="py-2.5 px-4">
                    <Link href={`/admin/orders/${o.id}`} className="text-[var(--glido-primary)] font-medium">
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4">{o.restaurant?.name}</td>
                  <td className="py-2.5 px-4">{o.user?.name ?? o.user?.email}</td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={o.status as never} />
                  </td>
                  <td className="py-2.5 px-4 font-medium">₹{o.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--glido-muted)]">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
