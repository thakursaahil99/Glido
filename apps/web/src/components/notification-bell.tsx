"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, PackageOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getSocket } from "@/lib/socket";
import type { Notification } from "@/lib/types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  async function loadUnread() {
    try {
      const res = await api.get<{ count: number }>("/notifications/me/unread-count");
      setUnread(res.count);
    } catch {
      // ignore — bell just stays quiet
    }
  }

  async function loadList() {
    try {
      const res = await api.get<{ items: Notification[] }>("/notifications/me?pageSize=15");
      setItems(res.items);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!user) return;
    loadUnread();
    const socket = getSocket();
    socket.emit("user:subscribe", user.id);
    const handler = () => {
      loadUnread();
      if (open) loadList();
    };
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [user, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) loadList();
      return next;
    });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await api.post("/notifications/me/read-all", {});
    } catch {
      // best-effort
    }
  }

  async function markOneRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((n) => Math.max(0, n - 1));
    try {
      await api.patch(`/notifications/me/${id}/read`, {});
    } catch {
      // best-effort
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          dark ? "text-white/90 hover:bg-white/10" : "text-[var(--glido-ink)] hover:bg-gray-100"
        }`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--glido-accent)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-[var(--glido-border)] bg-white shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glido-border)]">
            <span className="text-sm font-semibold text-[var(--glido-ink)]">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-[var(--glido-primary)] hover:text-[var(--glido-primary-dark)]"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-[var(--glido-muted)]">
                <PackageOpen size={28} />
                <span className="text-sm">No notifications yet</span>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.isRead && markOneRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--glido-border)] last:border-0 transition-colors hover:bg-gray-50 ${
                    n.isRead ? "" : "bg-[var(--glido-primary-light)]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--glido-ink)]">{n.title}</span>
                    {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--glido-primary)]" />}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--glido-muted)] line-clamp-2">{n.body}</p>
                  <span className="mt-1 block text-[11px] text-[var(--glido-muted)]">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
