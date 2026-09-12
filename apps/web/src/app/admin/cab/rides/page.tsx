"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Paginated, Ride } from "@/lib/types";
import { RideStatusBadge } from "@/components/ride-status";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

const STATUS_TABS = ["ALL", "REQUESTED", "DRIVER_ASSIGNED", "DRIVER_ARRIVED", "ONGOING", "COMPLETED", "CANCELLED"] as const;

export default function AdminCabRidesPage() {
  return (
    <RequirePermission permission="manage_rides">
      <RidesContent />
    </RequirePermission>
  );
}

function RidesContent() {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<Ride>>(
        `/admin/cab/rides?pageSize=50${status !== "ALL" ? `&status=${status}` : ""}`,
      );
      setRides(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load rides.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cab Rides</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatus(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${
              status === tab ? "bg-[var(--glido-primary)] text-white" : "bg-white border border-[var(--glido-border)] text-[var(--glido-muted)]"
            }`}
          >
            {tab.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && rides === null && <div className="h-40 skeleton" />}
      {!error && rides && rides.length === 0 && <EmptyState icon={Car} title="No rides in this status" />}

      {!error && rides && rides.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50">
                <th className="py-2.5 px-4">Ride</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Driver</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Fare</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => (
                <tr key={r.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <Link href={`/admin/cab/rides/${r.id}`} className="font-medium text-[var(--glido-primary)]">
                      #{r.rideNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4">{r.user?.name ?? r.user?.email}</td>
                  <td className="py-2.5 px-4">{r.driver?.name ?? "—"}</td>
                  <td className="py-2.5 px-4">
                    <RideStatusBadge status={r.status} />
                  </td>
                  <td className="py-2.5 px-4">₹{(r.finalFare ?? r.estimatedFare).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
