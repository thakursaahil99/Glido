"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";
import { ErrorState } from "@/components/empty-state";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal } from "@/components/modal";

export default function PartnerMenuPage() {
  const { show } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", price: 0, categoryId: "", description: "", imageUrl: "", isVeg: true });

  async function load() {
    setError(null);
    try {
      setRestaurant(await api.get<Restaurant>("/partner/restaurant"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your menu.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/partner/restaurant/categories", { name: categoryName });
      setShowAddCategory(false);
      setCategoryName("");
      show("Category added", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not add category.", "error");
    }
  }

  async function deleteCategory(categoryId: string) {
    try {
      await api.delete(`/partner/restaurant/categories/${categoryId}`);
      show("Category deleted", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not delete category.", "error");
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/partner/restaurant/items", {
        ...itemForm,
        categoryId: itemForm.categoryId || undefined,
      });
      setShowAddItem(false);
      setItemForm({ name: "", price: 0, categoryId: "", description: "", imageUrl: "", isVeg: true });
      show("Menu item added", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not add item.", "error");
    }
  }

  async function toggleItemAvailability(item: MenuItem) {
    try {
      await api.patch(`/partner/restaurant/items/${item.id}`, { isAvailable: !item.isAvailable });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update item.", "error");
    }
  }

  async function deleteItem(itemId: string) {
    try {
      await api.delete(`/partner/restaurant/items/${itemId}`);
      show("Item deleted", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not delete item.", "error");
    }
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!restaurant) return <div className="h-40 skeleton" />;

  const categories: MenuCategory[] = restaurant.menuCategories ?? [];
  const items: MenuItem[] = restaurant.menuItems ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Menu</h1>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Categories</h2>
        <button onClick={() => setShowAddCategory(true)} className="btn-secondary text-sm !py-1.5">
          + Add category
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <span key={c.id} className="badge badge-muted gap-2">
            {c.name}
            <button onClick={() => deleteCategory(c.id)} className="text-[var(--glido-danger)]">
              <X size={12} />
            </button>
          </span>
        ))}
        {categories.length === 0 && <p className="text-sm text-[var(--glido-muted)]">No categories yet.</p>}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Menu items</h2>
        <button onClick={() => setShowAddItem(true)} className="btn-secondary text-sm !py-1.5">
          + Add item
        </button>
      </div>
      <div className="card-glido overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50">
              <th className="py-2 px-4">Item</th>
              <th className="py-2 px-4">Price</th>
              <th className="py-2 px-4">Available</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--glido-border)] last:border-0">
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    {resolveMediaUrl(item.imageUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(item.imageUrl)} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    )}
                    <span className={`badge ${item.isVeg ? "badge-veg" : "badge-nonveg"}`}>{item.isVeg ? "V" : "NV"}</span>
                    {item.name}
                  </div>
                </td>
                <td className="py-2 px-4">₹{item.price}</td>
                <td className="py-2 px-4">
                  <button onClick={() => toggleItemAvailability(item)} className={item.isAvailable ? "text-[var(--glido-primary)]" : "text-[var(--glido-danger)]"}>
                    {item.isAvailable ? "Available" : "Unavailable"}
                  </button>
                </td>
                <td className="py-2 px-4">
                  <button onClick={() => deleteItem(item.id)} className="text-[var(--glido-danger)] font-medium">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[var(--glido-muted)]">
                  No menu items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showAddCategory} title="Add category" onClose={() => setShowAddCategory(false)}>
        <form onSubmit={addCategory} className="space-y-2">
          <input className="input-glido" placeholder="Category name" required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          <button className="btn-primary w-full">Add category</button>
        </form>
      </Modal>

      <Modal open={showAddItem} title="Add menu item" onClose={() => setShowAddItem(false)}>
        <form onSubmit={addItem} className="space-y-2">
          <input className="input-glido" placeholder="Item name" required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
          <textarea className="input-glido" placeholder="Description" rows={2} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
          <ImageUploadField label="Item photo" value={itemForm.imageUrl} onChange={(imageUrl) => setItemForm({ ...itemForm, imageUrl })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Price
              <input type="number" className="input-glido mt-1" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Category
              <select className="input-glido mt-1" value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={itemForm.isVeg} onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.checked })} />
            Vegetarian
          </label>
          <button className="btn-primary w-full">Add item</button>
        </form>
      </Modal>
    </div>
  );
}
