"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutGrid, ShoppingBasket, SearchX } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useGroceryCart } from "@/lib/grocery-cart-context";
import type { GroceryCategory, GroceryProduct, Paginated } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { ProductDetailModal } from "@/components/product-gallery-modal";

export default function GroceryPage() {
  const { items, addItem, updateQuantity, itemCount, subtotal } = useGroceryCart();
  const [categories, setCategories] = useState<GroceryCategory[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<GroceryProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState<GroceryProduct | null>(null);

  useEffect(() => {
    api.get<GroceryCategory[]>("/grocery/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ pageSize: "60" });
      if (activeCategory) query.set("categoryId", activeCategory);
      if (search) query.set("search", search);
      const res = await api.get<Paginated<GroceryProduct>>(`/grocery/products?${query.toString()}`);
      setProducts(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load products. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadProducts();
  }

  function cartQtyFor(productId: string) {
    return items.find((i) => i.productId === productId)?.quantity ?? 0;
  }

  return (
    <div className="pb-28">
      <section className="bg-gradient-to-b from-[var(--glido-primary-light)] to-transparent">
        <div className="container-glido py-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Groceries, delivered fast</h1>
          <p className="text-sm text-[var(--glido-muted)] mt-1">Fruits, dairy, snacks and household essentials.</p>
          <form onSubmit={onSearchSubmit} className="mt-4 flex gap-2 max-w-lg">
            <input
              className="input-glido"
              placeholder="Search for atta, milk, chips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-primary shrink-0">Search</button>
          </form>
        </div>
      </section>

      <div className="container-glido py-6">
        <div className="flex gap-4 overflow-x-auto pb-2 mb-6">
          <button onClick={() => setActiveCategory(null)} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
            <span
              className={`h-14 w-14 rounded-full flex items-center justify-center text-xl border-2 ${
                activeCategory === null ? "border-[var(--glido-primary)] bg-[var(--glido-primary-light)]" : "border-[var(--glido-border)] bg-white"
              }`}
            >
              <LayoutGrid size={20} className="text-[var(--glido-muted)]" />
            </span>
            <span className={`text-xs font-medium text-center leading-tight ${activeCategory === null ? "text-[var(--glido-primary-dark)]" : "text-[var(--glido-muted)]"}`}>
              All
            </span>
          </button>
          {categories?.map((c) => {
            const catImage = resolveMediaUrl(c.imageUrl);
            const active = activeCategory === c.id;
            return (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                <span
                  className={`h-14 w-14 rounded-full overflow-hidden flex items-center justify-center text-xl border-2 ${
                    active ? "border-[var(--glido-primary)]" : "border-[var(--glido-border)]"
                  } ${active ? "bg-[var(--glido-primary-light)]" : "bg-white"}`}
                >
                  {catImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={catImage} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBasket size={20} className="text-[var(--glido-muted)]" />
                  )}
                </span>
                <span className={`text-xs font-medium text-center leading-tight ${active ? "text-[var(--glido-primary-dark)]" : "text-[var(--glido-muted)]"}`}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        {error && <ErrorState message={error} onRetry={loadProducts} />}

        {!error && loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-glido overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-3/4 skeleton" />
                  <div className="h-3 w-1/2 skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!error && !loading && products && products.length === 0 && (
          <EmptyState icon={SearchX} title="No products found" description="Try a different search or category." />
        )}

        {!error && !loading && products && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const qty = cartQtyFor(p.id);
              const discountPct = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
              const image = resolveMediaUrl(p.imageUrl);
              return (
                <div key={p.id} className="card-glido overflow-hidden">
                  <button
                    onClick={() => setGalleryProduct(p)}
                    aria-label={`View photos of ${p.name}`}
                    className="block w-full aspect-square bg-gray-50 relative overflow-hidden"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingBasket size={28} className="text-gray-300" />
                      </div>
                    )}
                    {discountPct > 0 && (
                      <span className="absolute top-2 left-2 badge bg-[var(--glido-success)] text-white">{discountPct}% off</span>
                    )}
                    {(p.images?.length ?? 0) > 1 && (
                      <span className="absolute bottom-2 right-2 badge bg-black/60 text-white">
                        1/{p.images!.length}
                      </span>
                    )}
                  </button>
                  <button onClick={() => setGalleryProduct(p)} className="block w-full text-left p-3">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-xs text-[var(--glido-muted)] mt-0.5">{p.unit}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-sm font-bold">₹{p.price}</span>
                      {p.mrp > p.price && <span className="text-xs text-[var(--glido-muted)] line-through">₹{p.mrp}</span>}
                    </div>
                  </button>
                  <div className="px-3 pb-3">
                    {p.stockQty === 0 ? (
                      <p className="text-xs text-[var(--glido-danger)] font-medium mt-2">Out of stock</p>
                    ) : qty === 0 ? (
                      <button
                        onClick={() =>
                          addItem({
                            productId: p.id,
                            name: p.name,
                            price: p.price,
                            unit: p.unit,
                            imageUrl: p.imageUrl,
                            maxStock: p.stockQty,
                          })
                        }
                        className="btn-secondary w-full mt-2 text-sm !py-1.5"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center justify-between mt-2 bg-[var(--glido-primary)] rounded-lg text-white">
                        <button onClick={() => updateQuantity(p.id, qty - 1)} className="px-3 py-1.5 font-bold">
                          −
                        </button>
                        <span className="text-sm font-semibold">{qty}</span>
                        <button
                          disabled={qty >= p.stockQty}
                          onClick={() => updateQuantity(p.id, qty + 1)}
                          className="px-3 py-1.5 font-bold disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <Link
          href="/grocery/cart"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 btn-primary shadow-lg px-6 z-30"
        >
          View cart · {itemCount} items · ₹{subtotal.toFixed(0)}
        </Link>
      )}

      {galleryProduct && (
        <ProductDetailModal
          product={galleryProduct}
          quantity={cartQtyFor(galleryProduct.id)}
          onAdd={() =>
            addItem({
              productId: galleryProduct.id,
              name: galleryProduct.name,
              price: galleryProduct.price,
              unit: galleryProduct.unit,
              imageUrl: galleryProduct.imageUrl,
              maxStock: galleryProduct.stockQty,
            })
          }
          onChangeQuantity={(q) => updateQuantity(galleryProduct.id, q)}
          onClose={() => setGalleryProduct(null)}
        />
      )}
    </div>
  );
}
