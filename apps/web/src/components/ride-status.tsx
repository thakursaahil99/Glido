import type { RideStatus } from "@/lib/types";

export const RIDE_STATUS_LABEL: Record<RideStatus, string> = {
  REQUESTED: "Finding a driver",
  DRIVER_ASSIGNED: "Driver assigned",
  DRIVER_ARRIVED: "Driver has arrived",
  ONGOING: "On the way",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const FLOW: RideStatus[] = ["REQUESTED", "DRIVER_ASSIGNED", "DRIVER_ARRIVED", "ONGOING", "COMPLETED"];

export function RideStatusBadge({ status }: { status: RideStatus }) {
  const tone = status === "COMPLETED" ? "badge-veg" : status === "CANCELLED" ? "badge-nonveg" : "badge-status";
  return <span className={`badge ${tone}`}>{RIDE_STATUS_LABEL[status]}</span>;
}

export function RideTimeline({ status }: { status: RideStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="card-glido p-4 border-l-4 border-l-[var(--glido-danger)]">
        <p className="font-semibold text-[var(--glido-danger)]">Ride cancelled</p>
      </div>
    );
  }

  const currentIndex = FLOW.indexOf(status);

  return (
    <div className="flex flex-col gap-0">
      {FLOW.map((s, i) => {
        const done = i <= currentIndex;
        const isLast = i === FLOW.length - 1;
        return (
          <div key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`h-3 w-3 rounded-full shrink-0 ${done ? "bg-[var(--glido-primary)]" : "bg-gray-200"}`} />
              {!isLast && <div className={`w-0.5 flex-1 min-h-6 ${done ? "bg-[var(--glido-primary)]" : "bg-gray-200"}`} />}
            </div>
            <p className={`text-sm pb-6 ${done ? "font-medium text-[var(--glido-ink)]" : "text-[var(--glido-muted)]"}`}>
              {RIDE_STATUS_LABEL[s]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
