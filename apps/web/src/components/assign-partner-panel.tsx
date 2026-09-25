"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { DeliveryPartner } from "@/lib/types";

/** Manual delivery-partner assign/reassign panel for an admin order-detail page.
 *  `assignPath` is the order-specific PATCH endpoint (food vs grocery differ). */
const ACCEPTANCE_LABEL: Record<string, { text: string; className: string }> = {
  PENDING: { text: "Waiting for partner to accept", className: "badge-nonveg" },
  ACCEPTED: { text: "Accepted by partner", className: "badge-veg" },
  REJECTED: { text: "Rejected by partner", className: "badge-nonveg" },
};

export function AssignPartnerPanel({
  currentPartner,
  assignPath,
  onAssigned,
  readOnly = false,
  acceptanceStatus,
}: {
  currentPartner: DeliveryPartner | null | undefined;
  assignPath: string;
  onAssigned: () => void;
  readOnly?: boolean;
  /** "NONE" | "PENDING" | "ACCEPTED" | "REJECTED" — whether the assigned partner has responded yet. */
  acceptanceStatus?: string;
}) {
  const { show } = useToast();
  const [partners, setPartners] = useState<DeliveryPartner[] | null>(null);
  const [selected, setSelected] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || partners) return;
    api
      .get<{ items: DeliveryPartner[] }>("/admin/delivery-partners?status=APPROVED&pageSize=100")
      .then((res) => setPartners(res.items))
      .catch(() => setPartners([]));
  }, [open, partners]);

  async function assign() {
    if (!selected) return;
    setAssigning(true);
    try {
      await api.patch(assignPath, { deliveryPartnerId: selected });
      show("Delivery partner assigned.", "success");
      setOpen(false);
      setSelected("");
      onAssigned();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not assign delivery partner.", "error");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="card-glido p-4 mb-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Delivery partner</h3>
        {!readOnly && (
          <button className="text-xs text-[var(--glido-primary)] font-medium" onClick={() => setOpen((v) => !v)}>
            {currentPartner ? "Reassign" : "Assign"}
          </button>
        )}
      </div>

      {currentPartner ? (
        <>
          <p>{currentPartner.name} · {currentPartner.phone}</p>
          <p className="text-[var(--glido-muted)]">{currentPartner.vehicleType}</p>
          {acceptanceStatus && ACCEPTANCE_LABEL[acceptanceStatus] && (
            <span className={`badge ${ACCEPTANCE_LABEL[acceptanceStatus].className} mt-2 inline-block`}>
              {ACCEPTANCE_LABEL[acceptanceStatus].text}
            </span>
          )}
        </>
      ) : (
        <p className="text-[var(--glido-muted)]">No delivery partner assigned{readOnly ? "." : " yet."}</p>
      )}

      {!readOnly && open && (
        <div className="mt-3 pt-3 border-t border-[var(--glido-border)] flex flex-col gap-2">
          {partners === null ? (
            <div className="h-8 skeleton" />
          ) : partners.length === 0 ? (
            <p className="text-[var(--glido-muted)]">No approved delivery partners found.</p>
          ) : (
            <select
              className="input-glido"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select a partner…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.vehicleType}
                  {p.isOnline ? " · online" : " · offline"}
                  {p.id === currentPartner?.id ? " (current)" : ""}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary self-start" disabled={!selected || assigning} onClick={assign}>
            {assigning ? "Assigning…" : "Confirm assignment"}
          </button>
        </div>
      )}
    </div>
  );
}
