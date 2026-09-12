"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Paginated, User } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { RequirePermission } from "@/components/require-permission";

export default function AdminUsersPage() {
  return (
    <RequirePermission permission="manage_users">
      <UsersContent />
    </RequirePermission>
  );
}

function UsersContent() {
  const { show } = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load(q = "") {
    setError(null);
    try {
      const res = await api.get<Paginated<User>>(
        `/admin/users?pageSize=50&role=CUSTOMER${q ? `&search=${encodeURIComponent(q)}` : ""}`,
      );
      setUsers(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load users.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleBlock(user: User & { status?: string }) {
    const newStatus = user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus });
      show(newStatus === "BLOCKED" ? "User blocked" : "User unblocked", "success");
      load(search);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update user.", "error");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="flex gap-2 mb-4 max-w-sm"
      >
        <input className="input-glido" placeholder="Search name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-secondary shrink-0">Search</button>
      </form>

      {error && <ErrorState message={error} onRetry={() => load(search)} />}

      {!error && users === null && <div className="h-40 skeleton" />}
      {!error && users && users.length === 0 && <EmptyState icon={Users} title="No users found" />}

      {!error && users && users.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Contact</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users as Array<User & { status?: string }>).map((u) => (
                <tr key={u.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">{u.name ?? "—"}</td>
                  <td className="py-2.5 px-4">{u.email ?? u.phone}</td>
                  <td className="py-2.5 px-4">{u.role}</td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${u.status === "BLOCKED" ? "badge-nonveg" : "badge-veg"}`}>{u.status ?? "ACTIVE"}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    {u.role !== "ADMIN" && (
                      <button onClick={() => toggleBlock(u)} className={u.status === "BLOCKED" ? "text-[var(--glido-primary)] font-medium" : "text-[var(--glido-danger)] font-medium"}>
                        {u.status === "BLOCKED" ? "Unblock" : "Block"}
                      </button>
                    )}
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
