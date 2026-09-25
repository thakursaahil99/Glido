"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { X } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { City, MenuCategory, MenuItem, Restaurant } from "@/lib/types";
import { ErrorState } from "@/components/empty-state";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

export default function AdminRestaurantDetailPage() {
  return (
    <RequirePermission permission="manage_restaurants">
      <RestaurantDetailContent />
    </RequirePermission>
  );
}

function RestaurantDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", price: 0, categoryId: "", description: "", imageUrl: "", isVeg: true });

  async function load() {
    setError(null);
    try {
      setRestaurant(await api.get<Restaurant>(`/admin/restaurants/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load restaurant.");
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    api.get<City[]>("/cities").then(setCities).catch(() => {});
  }, []);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;
    try {
      await api.patch(`/admin/restaurants/${id}`, {
        name: restaurant.name,
        description: restaurant.description,
        cuisineTags: restaurant.cuisineTags,
        imageUrl: restaurant.imageUrl,
        cityId: restaurant.cityId || undefined,
        addressLine: restaurant.addressLine || undefined,
        lat: restaurant.lat ?? undefined,
        lng: restaurant.lng ?? undefined,
        openingTime: restaurant.openingTime,
        closingTime: restaurant.closingTime,
        deliveryFee: restaurant.deliveryFee,
        packagingFee: restaurant.packagingFee,
        minOrderAmount: restaurant.minOrderAmount,
        commissionPercent: restaurant.commissionPercent,
        isOpen: restaurant.isOpen,
      });
      show("Restaurant updated", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not save changes.", "error");
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/admin/restaurants/${id}/categories`, { name: categoryName });
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
      await api.delete(`/admin/restaurants/${id}/categories/${categoryId}`);
      show("Category deleted", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not delete category.", "error");
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/admin/restaurants/${id}/items`, {
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
      await api.patch(`/admin/restaurants/${id}/items/${item.id}`, { isAvailable: !item.isAvailable });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update item.", "error");
    }
  }

  async function deleteItem(itemId: string) {
    try {
      await api.delete(`/admin/restaurants/${id}/items/${itemId}`);
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <span className="badge badge-status">{restaurant.status}</span>
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        ★ {restaurant.ratingAvg.toFixed(1)} ({restaurant.ratingCount} ratings)
        {restaurant.createdAt && <> · Joined {new Date(restaurant.createdAt).toLocaleDateString()}</>}
      </p>

      {restaurant.owner && (
        <div className="card-glido p-4 mb-6 text-sm">
          <h2 className="font-semibold mb-2">Owner account</h2>
          <p>{restaurant.owner.name ?? "—"}</p>
          <p className="text-[var(--glido-muted)] text-xs">{restaurant.owner.email ?? "—"} · {restaurant.owner.phone ?? "—"}</p>
        </div>
      )}

      <form onSubmit={saveDetails} className="card-glido p-4 mb-6 space-y-2">
        <h2 className="font-semibold mb-1">Restaurant details</h2>
        <input className="input-glido" value={restaurant.name} onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })} />
        <textarea className="input-glido" rows={2} value={restaurant.description ?? ""} onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })} />
        <input className="input-glido" placeholder="Cuisine tags" value={restaurant.cuisineTags ?? ""} onChange={(e) => setRestaurant({ ...restaurant, cuisineTags: e.target.value })} />
        <ImageUploadField label="Cover image" value={restaurant.imageUrl ?? ""} onChange={(imageUrl) => setRestaurant({ ...restaurant, imageUrl })} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            City
            <select className="input-glido mt-1" value={restaurant.cityId ?? ""} onChange={(e) => setRestaurant({ ...restaurant, cityId: e.target.value })}>
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Address
            <input className="input-glido mt-1" value={restaurant.addressLine ?? ""} onChange={(e) => setRestaurant({ ...restaurant, addressLine: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Latitude
            <input type="number" step="any" className="input-glido mt-1" value={restaurant.lat ?? ""} onChange={(e) => setRestaurant({ ...restaurant, lat: e.target.value ? Number(e.target.value) : null })} />
          </label>
          <label className="text-xs">
            Longitude
            <input type="number" step="any" className="input-glido mt-1" value={restaurant.lng ?? ""} onChange={(e) => setRestaurant({ ...restaurant, lng: e.target.value ? Number(e.target.value) : null })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            Opening time
            <input type="time" className="input-glido mt-1" value={restaurant.openingTime} onChange={(e) => setRestaurant({ ...restaurant, openingTime: e.target.value })} />
          </label>
          <label className="text-xs">
            Closing time
            <input type="time" className="input-glido mt-1" value={restaurant.closingTime} onChange={(e) => setRestaurant({ ...restaurant, closingTime: e.target.value })} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">
            Delivery fee
            <input type="number" className="input-glido mt-1" value={restaurant.deliveryFee} onChange={(e) => setRestaurant({ ...restaurant, deliveryFee: Number(e.target.value) })} />
          </label>
          <label className="text-xs">
            Packaging fee
            <input type="number" className="input-glido mt-1" value={restaurant.packagingFee} onChange={(e) => setRestaurant({ ...restaurant, packagingFee: Number(e.target.value) })} />
          </label>
          <label className="text-xs">
            Min order
            <input type="number" className="input-glido mt-1" value={restaurant.minOrderAmount} onChange={(e) => setRestaurant({ ...restaurant, minOrderAmount: Number(e.target.value) })} />
          </label>
        </div>
        <label className="text-xs block">
          Commission % (Glido&apos;s cut per order)
          <input type="number" className="input-glido mt-1" value={restaurant.commissionPercent} onChange={(e) => setRestaurant({ ...restaurant, commissionPercent: Number(e.target.value) })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={restaurant.isOpen} onChange={(e) => setRestaurant({ ...restaurant, isOpen: e.target.checked })} />
          Currently open for orders
        </label>
        <button className="btn-primary">Save changes</button>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Menu categories</h2>
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
            <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
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
