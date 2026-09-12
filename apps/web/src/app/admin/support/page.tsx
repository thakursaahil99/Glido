"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { SupportMessage } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

interface ConversationUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Conversation {
  user: ConversationUser;
  lastMessage: SupportMessage | null;
  unreadCount: number;
}

export default function AdminSupportPage() {
  return (
    <RequirePermission permission="manage_support">
      <SupportInbox />
    </RequirePermission>
  );
}

function SupportInbox() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    setError(null);
    try {
      setConversations(await api.get<Conversation[]>("/admin/support/conversations"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load conversations.");
    }
  }

  async function openConversation(userId: string) {
    setSelectedUserId(userId);
    setMessages(null);
    try {
      const res = await api.get<{ user: ConversationUser; messages: SupportMessage[] }>(`/admin/support/${userId}/messages`);
      setSelectedUser(res.user);
      setMessages(res.messages);
      setConversations((prev) => prev?.map((c) => (c.user.id === userId ? { ...c, unreadCount: 0 } : c)) ?? null);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not load this conversation.");
    }
  }

  useEffect(() => {
    loadConversations();
    const socket = getSocket();
    socket.emit("admin:support:subscribe");
    const handler = (payload: SupportMessage) => {
      loadConversations();
      setSelectedUserId((current) => {
        if (current === payload.userId) {
          setMessages((prev) => (prev ? [...prev, payload] : [payload]));
        }
        return current;
      });
    };
    socket.on("support:message", handler);
    return () => {
      socket.off("support:message", handler);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!selectedUserId) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setDraft("");
    try {
      const created = await api.post<SupportMessage>(`/admin/support/${selectedUserId}/messages`, { message: text });
      setMessages((prev) => (prev ? [...prev, created] : [created]));
    } catch (e) {
      setDraft(text);
      alert(e instanceof ApiError ? e.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={loadConversations} />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Support inbox</h1>
      <p className="text-sm text-[var(--glido-muted)] mb-6">Live chat with customers.</p>

      <div className="card-glido flex h-[32rem] overflow-hidden p-0">
        <div className="w-64 shrink-0 overflow-y-auto border-r border-[var(--glido-border)]">
          {conversations === null && <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 skeleton" />)}</div>}
          {conversations && conversations.length === 0 && (
            <div className="p-6">
              <EmptyState icon={MessageCircle} title="No conversations yet" description="Customer messages will show up here." />
            </div>
          )}
          {conversations?.map((c) => (
            <button
              key={c.user.id}
              onClick={() => openConversation(c.user.id)}
              className={`block w-full border-b border-[var(--glido-border)] px-3 py-3 text-left transition-colors hover:bg-gray-50 ${
                selectedUserId === c.user.id ? "bg-[var(--glido-primary-light)]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{c.user.name ?? c.user.email ?? c.user.phone ?? "Customer"}</span>
                {c.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--glido-accent)] px-1 text-[10px] font-bold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[var(--glido-muted)] mt-0.5">{c.lastMessage?.message ?? ""}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          {!selectedUserId ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--glido-muted)]">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="border-b border-[var(--glido-border)] px-4 py-3">
                <span className="text-sm font-semibold">{selectedUser?.name ?? selectedUser?.email ?? "Customer"}</span>
                <p className="text-xs text-[var(--glido-muted)]">{selectedUser?.email ?? selectedUser?.phone}</p>
              </div>
              <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages === null && <div className="h-24 skeleton" />}
                {messages?.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === "ADMIN" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                        m.senderRole === "ADMIN"
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
                className="flex items-center gap-2 border-t border-[var(--glido-border)] p-3"
              >
                <input
                  className="input-glido flex-1"
                  placeholder="Type a reply..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !draft.trim()} className="btn-primary shrink-0 !p-2.5 disabled:opacity-50" aria-label="Send">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
