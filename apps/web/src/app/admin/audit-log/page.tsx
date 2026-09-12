"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { AuditLogEntry, Paginated } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

const ACTION_LABELS: Record<string, string> = {
  STAFF_CREATED: "Employee created",
  STAFF_UPDATED: "Employee updated",
  USER_STATUS_CHANGED: "Customer status changed",
  RESTAURANT_STATUS_CHANGED: "Restaurant status changed",
  ORDER_STATUS_CHANGED: "Order status changed",
  GROCERY_ORDER_STATUS_CHANGED: "Grocery order status changed",
};

export default function AdminAuditLogPage() {
  return (
    <RequirePermission permission="manage_staff">
      <AuditLogContent />
    </RequirePermission>
  );
}

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<Paginated<AuditLogEntry>>("/admin/audit-log?pageSize=50");
      setEntries(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the audit log.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Audit Log</h1>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        Every sensitive admin action — staff changes, restaurant approvals, order status overrides,
        customer blocks — recorded with who did it and when.
      </p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && entries === null && <div className="h-40 skeleton" />}
      {!error && entries && entries.length === 0 && <EmptyState icon={Clock3} title="No admin actions logged yet" />}

      {!error && entries && entries.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50">
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">By</th>
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-4">Details</th>
                <th className="py-2.5 px-4">When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[var(--glido-border)] last:border-0 align-top">
                  <td className="py-2.5 px-4 font-medium">{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="py-2.5 px-4">{e.admin.name ?? e.admin.email}</td>
                  <td className="py-2.5 px-4 text-xs text-[var(--glido-muted)]">
                    {e.entity}
                    {e.entityId ? ` #${e.entityId.slice(-6)}` : ""}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--glido-muted)] max-w-xs">
                    {e.beforeJson && (
                      <div>
                        <span className="font-medium">Before:</span> {e.beforeJson}
                      </div>
                    )}
                    {e.afterJson && (
                      <div>
                        <span className="font-medium">After:</span> {e.afterJson}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--glido-muted)] whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
