"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Wallet as WalletIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { UserAdminDetail } from "@/lib/types";
import { ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

export default function AdminUserDetailPage() {
  return (
    <RequirePermission permission="manage_users">
      <UserDetailContent />
    </RequirePermission>
  );
}

function UserDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [user, setUser] = useState<UserAdminDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setUser(await api.get<UserAdminDetail>(`/admin/users/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this user.");
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleBlock() {
    if (!user) return;
    const newStatus = user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus });
      show(newStatus === "BLOCKED" ? "User blocked" : "User unblocked", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update user.", "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!user) return <div className="h-40 skeleton" />;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-[var(--glido-muted)] hover:text-[var(--glido-ink)] mb-4">
        <ArrowLeft size={15} /> Back to users
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? "Unnamed user"}</h1>
          <p className="text-sm text-[var(--glido-muted)]">{user.email ?? "—"} · {user.phone ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${user.status === "BLOCKED" ? "badge-nonveg" : "badge-veg"}`}>{user.status}</span>
          {user.role !== "ADMIN" && (
            <button onClick={toggleBlock} className={user.status === "BLOCKED" ? "btn-secondary text-sm !py-1.5" : "btn-danger-outline text-sm !py-1.5"}>
              {user.status === "BLOCKED" ? "Unblock" : "Block"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card-glido p-4">
          <p className="text-xs text-[var(--glido-muted)]">Wallet balance</p>
          <p className="text-xl font-bold">₹{(user.wallet?.balance ?? 0).toFixed(2)}</p>
        </div>
        <div className="card-glido p-4">
          <p className="text-xs text-[var(--glido-muted)]">Loyalty points</p>
          <p className="text-xl font-bold">{user.loyaltyPoints ?? 0}</p>
        </div>
        <div className="card-glido p-4">
          <p className="text-xs text-[var(--glido-muted)]">Joined</p>
          <p className="text-xl font-bold">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="card-glido p-4 mb-6 text-sm">
        <h2 className="font-semibold mb-3 flex items-center gap-1.5"><MapPin size={15} /> Saved addresses</h2>
        {user.addresses.length === 0 && <p className="text-[var(--glido-muted)]">No addresses saved.</p>}
        <div className="space-y-2">
          {user.addresses.map((a) => (
            <div key={a.id} className="border-b border-[var(--glido-border)] last:border-0 pb-2 last:pb-0">
              <p className="font-medium">{a.label} {a.isDefault && <span className="badge badge-muted ml-1">Default</span>}</p>
              <p className="text-[var(--glido-muted)] text-xs">{a.line1}{a.line2 ? `, ${a.line2}` : ""} {a.pincode ?? ""}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card-glido p-4 mb-6 text-sm">
        <h2 className="font-semibold mb-3 flex items-center gap-1.5"><WalletIcon size={15} /> Recent wallet transactions</h2>
        {(!user.wallet || user.wallet.transactions.length === 0) && <p className="text-[var(--glido-muted)]">No transactions yet.</p>}
        <div className="space-y-1.5">
          {user.wallet?.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <div>
                <p>{t.reason}</p>
                <p className="text-xs text-[var(--glido-muted)]">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <span className={t.type === "CREDIT" ? "text-[var(--glido-primary)] font-medium" : "text-[var(--glido-danger)] font-medium"}>
                {t.type === "CREDIT" ? "+" : "-"}₹{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <OrderHistoryCard title="Food orders" rows={user.orders.map((o) => ({ id: o.id, label: o.restaurant?.name ?? o.orderNumber, status: o.status, amount: o.totalAmount, date: o.createdAt }))} />
        <OrderHistoryCard title="Grocery orders" rows={user.groceryOrders.map((o) => ({ id: o.id, label: o.orderNumber, status: o.status, amount: o.totalAmount, date: o.createdAt }))} />
        <OrderHistoryCard title="Rides" rows={user.rides.map((r) => ({ id: r.id, label: r.rideNumber, status: r.status, amount: r.finalFare ?? r.estimatedFare, date: r.createdAt }))} />
      </div>

      {user.referrals.length > 0 && (
        <div className="card-glido p-4 text-sm">
          <h2 className="font-semibold mb-3">Referred users ({user.referrals.length})</h2>
          <div className="space-y-1.5">
            {user.referrals.map((r) => (
              <p key={r.id}>{r.name ?? r.phone ?? r.email}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderHistoryCard({ title, rows }: { title: string; rows: { id: string; label: string; status: string; amount: number; date: string }[] }) {
  return (
    <div className="card-glido p-4 text-sm">
      <h2 className="font-semibold mb-3">{title}</h2>
      {rows.length === 0 && <p className="text-[var(--glido-muted)] text-xs">None yet.</p>}
      <div className="space-y-2">
        {rows.slice(0, 8).map((r) => (
          <div key={r.id} className="flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <p className="truncate">{r.label}</p>
              <p className="text-[var(--glido-muted)]">{r.status}</p>
            </div>
            <span className="font-medium shrink-0">₹{r.amount.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
