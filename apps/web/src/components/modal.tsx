"use client";

import { X } from "lucide-react";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="card-glido w-full max-w-md p-5 animate-[fadeIn_.15s_ease]">
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
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      {description && <p className="text-sm text-[var(--glido-muted)] mb-4">{description}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} className={danger ? "btn-danger-outline" : "btn-primary"}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
