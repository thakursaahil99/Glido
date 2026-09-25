"use client";

import { useEffect, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { GroceryCategory } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

export default function AdminGroceryCategoriesPage() {
  return (
    <RequirePermission permission="manage_grocery">
      <CategoriesContent />
    </RequirePermission>
  );
}

function CategoriesContent() {
  const { show } = useToast();
  const [categories, setCategories] = useState<GroceryCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", imageUrl: "" });
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    try {
      setCategories(await api.get<GroceryCategory[]>("/admin/grocery/categories"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load categories.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(c: GroceryCategory) {
    try {
      await api.patch(`/admin/grocery/categories/${c.id}`, { isActive: !c.isActive });
      show(c.isActive ? "Category hidden" : "Category shown", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update category.", "error");
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/grocery/categories/${id}`);
      show("Category deleted", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not delete category. Remove its products first.", "error");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/grocery/categories", form);
      show("Category created", "success");
      setShowCreate(false);
      setForm({ name: "", imageUrl: "" });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create category.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Grocery Categories</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add category
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && categories === null && <div className="h-40 skeleton" />}
      {!error && categories && categories.length === 0 && <EmptyState icon={ShoppingBasket} title="No categories yet" />}

      {!error && categories && categories.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4 font-medium">{c.name}</td>
                  <td className="py-2.5 px-4">
                    <span className={`badge ${c.isActive ? "badge-veg" : "badge-muted"}`}>{c.isActive ? "Active" : "Hidden"}</span>
                  </td>
                  <td className="py-2.5 px-4 space-x-3">
                    <button onClick={() => toggleActive(c)} className="text-[var(--glido-primary)] font-medium">
                      {c.isActive ? "Hide" : "Show"}
                    </button>
                    <button onClick={() => remove(c.id)} className="text-[var(--glido-danger)] font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} title="Add category" onClose={() => setShowCreate(false)}>
        <form onSubmit={create} className="space-y-2">
          <input className="input-glido" placeholder="Category name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <ImageUploadField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          <button className="btn-primary w-full" disabled={creating}>{creating ? "Creating..." : "Create category"}</button>
        </form>
      </Modal>
    </div>
  );
}
