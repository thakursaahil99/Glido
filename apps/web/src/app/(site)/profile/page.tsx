"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { Address } from "@/lib/types";
import { ConfirmDialog } from "@/components/modal";

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/profile");
      return;
    }
    api.get<{ addresses: Address[]; wallet: { balance: number } | null }>("/users/me").then((me) => {
      setAddresses(me.addresses ?? []);
      setWallet(me.wallet);
    });
  }, [authLoading, user, router]);

  async function removeAddress(id: string) {
    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      show("Address removed", "success");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not remove address.", "error");
    } finally {
      setDeleteId(null);
    }
  }

  async function doLogout() {
    await logout();
    setLogoutOpen(false);
    router.push("/");
  }

  if (!user) return null;

  return (
    <div className="container-glido py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Your profile</h1>

      <div className="card-glido p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">{user.name ?? "Glido customer"}</p>
          <p className="text-sm text-[var(--glido-muted)]">{user.email ?? user.phone}</p>
        </div>
        <span className="badge badge-status uppercase">{user.role}</span>
      </div>

      <Link href="/wallet" className="card-glido p-4 mb-4 flex items-center justify-between hover:border-[var(--glido-primary)]">
        <div>
          <p className="text-sm text-[var(--glido-muted)]">Glido Wallet balance</p>
          <p className="text-2xl font-bold text-[var(--glido-primary)]">₹{(wallet?.balance ?? 0).toFixed(2)}</p>
        </div>
        <span className="btn-secondary text-sm !py-2 !px-3">Manage</span>
      </Link>

      <div className="card-glido p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Saved addresses</h3>
        </div>
        {addresses.length === 0 && <p className="text-sm text-[var(--glido-muted)]">No saved addresses yet.</p>}
        <div className="space-y-2">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-2 text-sm border-b border-[var(--glido-border)] pb-2 last:border-0">
              <span>
                <strong>{a.label}</strong> — {a.line1}
                {a.line2 ? `, ${a.line2}` : ""} {a.pincode}
              </span>
              <button onClick={() => setDeleteId(a.id)} className="text-[var(--glido-danger)] shrink-0">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/orders" className="btn-secondary text-center">
          Food orders
        </Link>
        <Link href="/grocery/orders" className="btn-secondary text-center">
          Grocery orders
        </Link>
        <Link href="/cab/rides" className="btn-secondary text-center col-span-2">
          Ride history
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/admin" className="btn-secondary text-center col-span-2">
            Admin panel
          </Link>
        )}
      </div>

      <button onClick={() => setLogoutOpen(true)} className="btn-danger-outline w-full">
        Log out
      </button>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out of Glido?"
        confirmLabel="Log out"
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={doLogout}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Remove this address?"
        confirmLabel="Remove"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && removeAddress(deleteId)}
      />
    </div>
  );
}
