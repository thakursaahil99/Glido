import type { OrderStatus } from "@glido/shared";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Order placed",
  ACCEPTED: "Accepted by restaurant",
  PREPARING: "Preparing your food",
  READY: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "DELIVERED"
      ? "badge-veg"
      : status === "CANCELLED" || status === "REFUNDED"
        ? "badge-nonveg"
        : "badge-status";
  return <span className={`badge ${tone}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="card-glido p-4 border-l-4 border-l-[var(--glido-danger)]">
        <p className="font-semibold text-[var(--glido-danger)]">{ORDER_STATUS_LABEL[status]}</p>
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status);

  return (
    <div className="flex flex-col gap-0">
      {STATUS_FLOW.map((s, i) => {
        const done = i <= currentIndex;
        const isLast = i === STATUS_FLOW.length - 1;
        return (
          <div key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full shrink-0 ${done ? "bg-[var(--glido-primary)]" : "bg-gray-200"}`}
              />
              {!isLast && <div className={`w-0.5 flex-1 min-h-6 ${done ? "bg-[var(--glido-primary)]" : "bg-gray-200"}`} />}
            </div>
            <p className={`text-sm pb-6 ${done ? "font-medium text-[var(--glido-ink)]" : "text-[var(--glido-muted)]"}`}>
              {ORDER_STATUS_LABEL[s]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
