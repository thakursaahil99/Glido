"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getSocket } from "@/lib/socket";
import type { SupportMessage } from "@/lib/types";

export function SupportChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await api.get<SupportMessage[]>("/support/messages");
      setMessages(res);
    } catch {
      // best-effort — chat just stays empty
    }
  }

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.emit("user:subscribe", user.id);
    const handler = (payload: SupportMessage) => {
      if (payload.senderRole === "ADMIN" && !open) setHasUnseen(true);
      setMessages((prev) => (prev ? [...prev, payload] : [payload]));
    };
    socket.on("support:message", handler);
    return () => {
      socket.off("support:message", handler);
    };
  }, [user, open]);

  useEffect(() => {
    if (open && messages === null) load();
    if (open) setHasUnseen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setDraft("");
    try {
      const created = await api.post<SupportMessage>("/support/messages", { message: text });
      setMessages((prev) => (prev ? [...prev, created] : [created]));
    } catch (e) {
      setDraft(text);
      if (e instanceof ApiError) alert(e.message);
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 max-w-[85vw] flex-col overflow-hidden rounded-2xl border border-[var(--glido-border)] bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[var(--glido-primary)] px-4 py-3 text-white">
            <span className="text-sm font-semibold">Glido Support</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages === null && <div className="h-24 skeleton" />}
            {messages && messages.length === 0 && (
              <p className="mt-8 text-center text-sm text-[var(--glido-muted)]">
                Have a question? Send us a message and our team will reply here.
              </p>
            )}
            {messages?.map((m) => (
              <div key={m.id} className={`flex ${m.senderRole === "CUSTOMER" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.senderRole === "CUSTOMER"
                      ? "bg-[var(--glido-primary)] text-white rounded-br-sm"
                      : "bg-gray-100 text-[var(--glido-ink)] rounded-bl-sm"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-[var(--glido-border)] p-2"
          >
            <input
              className="input-glido flex-1 !py-2"
              placeholder="Type a message..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary !p-2.5 shrink-0 disabled:opacity-50" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Support chat"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--glido-primary)] text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {hasUnseen && !open && <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-[var(--glido-accent)] ring-2 ring-white" />}
      </button>
    </div>
  );
}
