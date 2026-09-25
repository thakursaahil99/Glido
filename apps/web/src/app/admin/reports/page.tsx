"use client";

import { useEffect, useState } from "react";
import { IndianRupee, Package, ShoppingBag, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import { ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

interface ReportsData {
  rangeDays: number;
  totals: { revenue: number; orders: number; newCustomers: number; avgOrderValue: number };
  revenueSeries: Array<{ date: string; food: number; grocery: number; rides: number; total: number }>;
  ordersSeries: Array<{ date: string; food: number; grocery: number; rides: number; total: number }>;
  newUsersSeries: Array<{ date: string; count: number }>;
  topRestaurants: Array<{ id: string; name: string; orders: number; revenue: number }>;
  topGroceryProducts: Array<{ id: string; name: string; unitsSold: number; revenue: number }>;
  paymentBreakdown: Array<{ method: string; count: number; amount: number }>;
}

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function AdminReportsPage() {
  return (
    <RequirePermission permission="view_reports">
      <ReportsContent />
    </RequirePermission>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ReportsContent() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(r: number) {
    setError(null);
    setData(null);
    try {
      setData(await api.get<ReportsData>(`/admin/reports/overview?range=${r}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load reports.");
    }
  }

  useEffect(() => {
    load(range);
  }, [range]);

  if (error) return <ErrorState message={error} onRetry={() => load(range)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">Revenue, orders and growth across food, grocery and cab.</p>

      <div className="flex gap-2 mb-6">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              range === r.value ? "bg-[var(--glido-primary)] text-white" : "bg-white dark:bg-[var(--glido-surface)] border border-[var(--glido-border)] text-[var(--glido-muted)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 skeleton" />
            ))}
          </div>
          <div className="h-72 skeleton" />
        </div>
      ) : (
        <>
          <Totals data={data} />

          <div className="card-glido p-4 mb-6">
            <h2 className="font-semibold mb-4">Revenue over time</h2>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <AreaChart data={data.revenueSeries}>
                  <defs>
                    <linearGradient id="foodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="groceryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA36C" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0EA36C" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ridesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF0" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} tickMargin={8} />
                  <YAxis fontSize={12} width={44} />
                  <Tooltip labelFormatter={(v) => formatDate(String(v))} formatter={(v) => `₹${Number(v).toFixed(2)}`} />
                  <Legend />
                  <Area type="monotone" dataKey="food" name="Food" stroke="#FF6A00" fill="url(#foodGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="grocery" name="Grocery" stroke="#0EA36C" fill="url(#groceryGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="rides" name="Rides" stroke="#2563EB" fill="url(#ridesGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="card-glido p-4">
              <h2 className="font-semibold mb-4">Orders by module</h2>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={data.ordersSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF0" />
                    <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} tickMargin={6} />
                    <YAxis fontSize={11} width={30} allowDecimals={false} />
                    <Tooltip labelFormatter={(v) => formatDate(String(v))} />
                    <Legend />
                    <Bar dataKey="food" name="Food" stackId="a" fill="#FF6A00" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="grocery" name="Grocery" stackId="a" fill="#0EA36C" />
                    <Bar dataKey="rides" name="Rides" stackId="a" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-glido p-4">
              <h2 className="font-semibold mb-4">New customers</h2>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={data.newUsersSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF0" />
                    <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} tickMargin={6} />
                    <YAxis fontSize={11} width={30} allowDecimals={false} />
                    <Tooltip labelFormatter={(v) => formatDate(String(v))} />
                    <Bar dataKey="count" name="New customers" fill="#F99C00" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <RankedList
              title="Top restaurants"
              rows={data.topRestaurants.map((r) => ({ id: r.id, label: r.name, sub: `${r.orders} order${r.orders === 1 ? "" : "s"}`, value: `₹${r.revenue.toFixed(2)}` }))}
              emptyText="No paid food orders yet."
            />
            <RankedList
              title="Top grocery products"
              rows={data.topGroceryProducts.map((p) => ({ id: p.id, label: p.name, sub: `${p.unitsSold} sold`, value: `₹${p.revenue.toFixed(2)}` }))}
              emptyText="No paid grocery orders yet."
            />
            <RankedList
              title="Payment methods"
              rows={data.paymentBreakdown.map((p) => ({ id: p.method, label: p.method, sub: `${p.count} payment${p.count === 1 ? "" : "s"}`, value: `₹${p.amount.toFixed(2)}` }))}
              emptyText="No paid transactions yet."
            />
          </div>
        </>
      )}
    </div>
  );
}

function Totals({ data }: { data: ReportsData }) {
  const stats: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Revenue", value: `₹${data.totals.revenue.toFixed(2)}`, icon: IndianRupee },
    { label: "Orders & rides", value: String(data.totals.orders), icon: Package },
    { label: "Avg. order value", value: `₹${data.totals.avgOrderValue.toFixed(2)}`, icon: ShoppingBag },
    { label: "New customers", value: String(data.totals.newCustomers), icon: UserPlus },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="card-glido p-4">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-3 bg-[var(--glido-primary-light)] text-[var(--glido-primary-dark)]">
              <Icon size={18} strokeWidth={2} />
            </div>
            <p className="text-2xl font-bold leading-tight">{s.value}</p>
            <p className="text-xs text-[var(--glido-muted)] mt-0.5">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function RankedList({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: Array<{ id: string; label: string; sub: string; value: string }>;
  emptyText: string;
}) {
  return (
    <div className="card-glido p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--glido-muted)]">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-gray-100 dark:bg-[var(--glido-surface-alt)] text-xs font-semibold flex items-center justify-center shrink-0 text-[var(--glido-muted)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.label}</p>
                <p className="text-xs text-[var(--glido-muted)]">{r.sub}</p>
              </div>
              <span className="text-sm font-semibold shrink-0">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
