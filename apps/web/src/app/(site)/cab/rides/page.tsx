"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Paginated, Ride } from "@/lib/types";
import { RideStatusBadge } from "@/components/ride-status";
import { EmptyState, ErrorState } from "@/components/empty-state";

export default function CabRidesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<Ride>>("/cab/rides/me?pageSize=30");
      setRides(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your rides.");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/cab/rides");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="container-glido py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Your rides</h1>

      {rides === null && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 skeleton" />
          ))}
        </div>
      )}

      {rides && rides.length === 0 && (
        <EmptyState
          icon={Car}
          title="No rides yet"
          action={
            <Link href="/cab" className="btn-primary">
              Book a ride
            </Link>
          }
        />
      )}

      {rides && rides.length > 0 && (
        <div className="space-y-3">
          {rides.map((r) => (
            <Link key={r.id} href={`/cab/ride/${r.id}`} className="card-glido p-4 block hover:border-[var(--glido-primary)]">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{r.rideType?.name}</p>
                <RideStatusBadge status={r.status} />
              </div>
              <p className="text-xs text-[var(--glido-muted)] mt-2 truncate">{r.pickupAddress} → {r.dropAddress}</p>
              <div className="flex items-center justify-between mt-2 text-sm text-[var(--glido-muted)]">
                <span>#{r.rideNumber} · {new Date(r.createdAt).toLocaleString()}</span>
                <span className="font-semibold text-[var(--glido-ink)]">₹{(r.finalFare ?? r.estimatedFare).toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
