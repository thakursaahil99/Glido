"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { GroceryCategory, GroceryProduct, Paginated } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Modal } from "@/components/modal";
import { MultiImageUploadField } from "@/components/multi-image-upload-field";
import { RequirePermission } from "@/components/require-permission";

const emptyForm = {
  categoryId: "",
  name: "",
  brand: "",
  description: "",
  images: [] as string[],
  unit: "",
  mrp: 0,
  price: 0,
  stockQty: 0,
};

export default function AdminGroceryProductsPage() {
  return (
    <RequirePermission permission="manage_grocery">
      <ProductsContent />
    </RequirePermission>
  );
}

function ProductsContent() {
  const { show } = useToast();
  const [categories, setCategories] = useState<GroceryCategory[]>([]);
  const [products, setProducts] = useState<GroceryProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<GroceryProduct | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadCategories() {
    setCategories(await api.get<GroceryCategory[]>("/admin/grocery/categories"));
  }

  async function loadProducts() {
    setError(null);
    try {
      const query = categoryFilter ? `?categoryId=${categoryFilter}&pageSize=100` : "?pageSize=100";
      const res = await api.get<Paginated<GroceryProduct>>(`/admin/grocery/products${query}`);
      setProducts(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load products.");
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  async function toggleAvailability(p: GroceryProduct) {
    try {
      await api.patch(`/admin/grocery/products/${p.id}`, { isAvailable: !p.isAvailable });
      loadProducts();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update product.", "error");
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/grocery/products/${id}`);
      show("Product deleted", "success");
      loadProducts();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not delete product.", "error");
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/grocery/products", {
        ...form,
        categoryId: form.categoryId || undefined,
        imageUrl: form.images[0] ?? "",
      });
      show("Product added", "success");
      setShowCreate(false);
      setForm(emptyForm);
      loadProducts();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not add product.", "error");
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      const images = editing.images ?? [];
      await api.patch(`/admin/grocery/products/${editing.id}`, {
        name: editing.name,
        brand: editing.brand,
        unit: editing.unit,
        images,
        imageUrl: images[0] ?? "",
        mrp: editing.mrp,
        price: editing.price,
        stockQty: editing.stockQty,
        categoryId: editing.categoryId || undefined,
      });
      show("Product updated", "success");
      setEditing(null);
      loadProducts();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update product.", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Grocery Products</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Add product
        </button>
      </div>

      <select className="input-glido max-w-xs mb-4" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {error && <ErrorState message={error} onRetry={loadProducts} />}
      {!error && products === null && <div className="h-40 skeleton" />}
      {!error && products && products.length === 0 && <EmptyState icon={ShoppingCart} title="No products yet" />}

      {!error && products && products.length > 0 && (
        <div className="card-glido overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--glido-muted)] border-b border-[var(--glido-border)] bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Price</th>
                <th className="py-2.5 px-4">Stock</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--glido-border)] last:border-0">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      {resolveMediaUrl(p.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveMediaUrl(p.imageUrl)} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <span className="h-8 w-8 rounded bg-gray-100 dark:bg-[var(--glido-surface-alt)] flex items-center justify-center shrink-0">
                          <ShoppingCart size={14} className="text-gray-400 dark:text-[var(--glido-muted)]" />
                        </span>
                      )}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-[var(--glido-muted)]">{p.brand} · {p.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs">{p.category?.name ?? "—"}</td>
                  <td className="py-2.5 px-4">₹{p.price}{p.mrp > p.price && <span className="text-xs text-[var(--glido-muted)] line-through ml-1">₹{p.mrp}</span>}</td>
                  <td className="py-2.5 px-4">
                    <span className={p.stockQty === 0 ? "text-[var(--glido-danger)] font-medium" : ""}>{p.stockQty}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => toggleAvailability(p)} className={p.isAvailable ? "text-[var(--glido-primary)]" : "text-[var(--glido-danger)]"}>
                      {p.isAvailable ? "Available" : "Unavailable"}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 space-x-3">
                    <button
                      onClick={() => setEditing({ ...p, images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [] })}
                      className="text-[var(--glido-primary)] font-medium"
                    >
                      Edit
                    </button>
                    <button onClick={() => remove(p.id)} className="text-[var(--glido-danger)] font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} title="Add product" onClose={() => setShowCreate(false)} size="lg">
        <form onSubmit={createProduct} className="space-y-3">
          <input className="input-glido" placeholder="Product name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-glido" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <select className="input-glido" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input className="input-glido" placeholder="Unit (e.g. 500 g, 1 L)" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <MultiImageUploadField label="Photos" values={form.images} onChange={(images) => setForm({ ...form, images })} />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">
              MRP
              <input type="number" className="input-glido mt-1" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Price
              <input type="number" className="input-glido mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </label>
            <label className="text-xs">
              Stock
              <input type="number" className="input-glido mt-1" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} />
            </label>
          </div>
          <button className="btn-primary w-full mt-2">Add product</button>
        </form>
      </Modal>

      {editing && (
        <Modal open title={`Edit ${editing.name}`} onClose={() => setEditing(null)} size="lg">
          <form onSubmit={saveEdit} className="space-y-3">
            <input className="input-glido" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="input-glido" placeholder="Brand" value={editing.brand ?? ""} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
            <select
              className="input-glido"
              value={editing.categoryId ?? ""}
              onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input className="input-glido" value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            <MultiImageUploadField
              label="Photos"
              values={editing.images ?? []}
              onChange={(images) => setEditing({ ...editing, images, imageUrl: images[0] ?? editing.imageUrl })}
            />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs">
                MRP
                <input type="number" className="input-glido mt-1" value={editing.mrp} onChange={(e) => setEditing({ ...editing, mrp: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Price
                <input type="number" className="input-glido mt-1" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </label>
              <label className="text-xs">
                Stock
                <input type="number" className="input-glido mt-1" value={editing.stockQty} onChange={(e) => setEditing({ ...editing, stockQty: Number(e.target.value) })} />
              </label>
            </div>
            <button className="btn-primary w-full mt-2">Save changes</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
