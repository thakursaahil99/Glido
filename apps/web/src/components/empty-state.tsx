import { AlertTriangle, PackageOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-[var(--glido-primary-light)] flex items-center justify-center mb-4">
        <Icon size={30} strokeWidth={1.75} className="text-[var(--glido-primary)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--glido-ink)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--glido-muted)] max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-[var(--glido-danger-light)] flex items-center justify-center mb-4">
        <AlertTriangle size={30} strokeWidth={1.75} className="text-[var(--glido-danger)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--glido-ink)]">Something went wrong</h3>
      <p className="mt-1 text-sm text-[var(--glido-muted)] max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}
