"use client";

import { X } from "lucide-react";

const MAX_WIDTH_CLASSES = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

export function Modal({
  open,
  title,
  children,
  onClose,
  size = "md",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  /** "md" (default, forms with a handful of fields) · "lg" · "xl" (image galleries, longer forms) */
  size?: keyof typeof MAX_WIDTH_CLASSES;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className={`card-glido w-full ${MAX_WIDTH_CLASSES[size]} p-5 max-h-[90vh] overflow-y-auto animate-[fadeIn_.15s_ease]`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--glido-ink)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--glido-muted)] hover:text-[var(--glido-ink)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
  confirming = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** True while onConfirm's async work is in flight — disables both buttons so a
   *  double-click/tap on a slow network can't fire the confirm action twice. */
  confirming?: boolean;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      {description && <p className="text-sm text-[var(--glido-muted)] mb-4">{description}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={confirming} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={confirming} className={danger ? "btn-danger-outline" : "btn-primary"}>
          {confirming ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
