"use client";

import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_LABELS,
  DEFAULT_PERMISSIONS_BY_ADMIN_ROLE,
  PERMISSIONS,
  PERMISSION_LABELS,
  type AdminRole,
  type Permission,
} from "@glido/shared";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { StaffMember } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

export default function AdminStaffPage() {
  return (
    <RequirePermission permission="manage_staff">
      <StaffContent />
    </RequirePermission>
  );
}

function StaffContent() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  async function load() {
    setError(null);
    try {
      setStaff(await api.get<StaffMember[]>("/admin/staff"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load staff.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Staff & Employees</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add employee
        </button>
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        Create logins for your team — each role starts with a sensible default permission set that
        you can fine-tune per employee.
      </p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && staff === null && <div className="h-40 skeleton" />}
      {!error && staff && staff.length === 0 && <EmptyState icon={UserCog} title="No employees yet" />}

      {!error && staff && staff.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Permissions</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-[var(--glido-border)] last:border-0 align-top">
                  <td className="py-2.5 px-4">
                    {s.name ?? "—"}
                    {s.id === currentUser?.id && <span className="text-xs text-[var(--glido-muted)]"> (you)</span>}
                  </td>
                  <td className="py-2.5 px-4">{s.email}</td>
                  <td className="py-2.5 px-4">
                    <span className="badge badge-status">{ADMIN_ROLE_LABELS[s.adminRole]}</span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--glido-muted)] max-w-xs">
                    {s.adminRole === "SUPER_ADMIN" ? "All permissions" : `${s.permissions.length} granted`}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${s.status === "ACTIVE" ? "badge-veg" : "badge-nonveg"}`}>{s.status}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => setEditing(s)} className="text-[var(--glido-primary)] font-medium">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateStaffModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          load();
        }}
      />

      {editing && (
        <EditStaffModal
          staff={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PermissionChecklist({
  selected,
  onChange,
}: {
  selected: Permission[];
  onChange: (next: Permission[]) => void;
}) {
  function toggle(p: Permission) {
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border border-[var(--glido-border)] rounded-lg p-3 max-h-56 overflow-y-auto">
      {PERMISSIONS.map((p) => (
        <label key={p} className="flex items-start gap-2 text-xs">
          <input type="checkbox" className="mt-0.5" checked={selected.includes(p)} onChange={() => toggle(p)} />
          {PERMISSION_LABELS[p]}
        </label>
      ))}
    </div>
  );
}

function CreateStaffModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { show } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("SUPPORT_MANAGER");
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS_BY_ADMIN_ROLE.SUPPORT_MANAGER);
  const [submitting, setSubmitting] = useState(false);

  function onRoleChange(role: AdminRole) {
    setAdminRole(role);
    setPermissions(DEFAULT_PERMISSIONS_BY_ADMIN_ROLE[role]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin/staff", { name, email, password, adminRole, permissions });
      show("Employee created", "success");
      setName("");
      setEmail("");
      setPassword("");
      onCreated();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create employee.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Add employee" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-2">
        <input className="input-glido" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="email"
          className="input-glido"
          placeholder="Email (used to log in)"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="input-glido"
          placeholder="Temporary password (min 6 characters)"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="block text-xs">
          Role
          <select
            className="input-glido mt-1"
            value={adminRole}
            onChange={(e) => onRoleChange(e.target.value as AdminRole)}
          >
            {ADMIN_ROLES.filter((r) => r !== "SUPER_ADMIN").map((r) => (
              <option key={r} value={r}>
                {ADMIN_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium mt-2">Permissions</label>
        <PermissionChecklist selected={permissions} onChange={setPermissions} />
        <button className="btn-primary w-full mt-2" disabled={submitting}>
          {submitting ? "Creating..." : "Create employee"}
        </button>
      </form>
    </Modal>
  );
}

function EditStaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [adminRole, setAdminRole] = useState<AdminRole>(staff.adminRole);
  const [permissions, setPermissions] = useState<Permission[]>(staff.permissions);
  const [status, setStatus] = useState(staff.status);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/admin/staff/${staff.id}`, {
        adminRole,
        permissions,
        status,
        newPassword: newPassword || undefined,
      });
      show("Employee updated", "success");
      onSaved();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update employee.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open title={`Edit ${staff.name ?? staff.email}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-xs">
          Role
          <select
            className="input-glido mt-1"
            value={adminRole}
            onChange={(e) => setAdminRole(e.target.value as AdminRole)}
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {ADMIN_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          Status
          <select
            className="input-glido mt-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        {adminRole !== "SUPER_ADMIN" && (
          <>
            <label className="block text-xs font-medium mt-2">Permissions</label>
            <PermissionChecklist selected={permissions} onChange={setPermissions} />
          </>
        )}
        <input
          type="password"
          className="input-glido"
          placeholder="Reset password (leave blank to keep current)"
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button className="btn-primary w-full mt-2" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}
