"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutGrid, ShoppingBasket, SearchX, Zap, Sparkles } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useGroceryCart } from "@/lib/grocery-cart-context";
import type { GroceryCategory, GroceryProduct, Paginated } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { ProductDetailModal } from "@/components/product-gallery-modal";

function discountPercent(p: GroceryProduct) {
  return p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
}

export default function GroceryPage() {
  const { items, addItem, updateQuantity, itemCount, subtotal } = useGroceryCart();
  const [categories, setCategories] = useState<GroceryCategory[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<GroceryProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState<GroceryProduct | null>(null);

  // An unfiltered catalog snapshot, used only to power the "Lightning Deals" / "Popular
  // Picks" discovery carousels at the top of the page. It's independent of the
  // category/search filters that drive the main product grid below.
  const [catalog, setCatalog] = useState<GroceryProduct[] | null>(null);

  useEffect(() => {
    api.get<GroceryCategory[]>("/grocery/categories").then(setCategories).catch(() => setCategories([]));
    api
      .get<Paginated<GroceryProduct>>("/grocery/products?pageSize=60")
      .then((res) => setCatalog(res.items))
      .catch(() => setCatalog([]));
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

  // Honest, data-derived discovery rows: no fabricated "bestseller" flags or fake ratings.
  const dealProducts = (catalog ?? [])
    .filter((p) => discountPercent(p) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a))
    .slice(0, 10);
  const dealIds = new Set(dealProducts.map((p) => p.id));
  const popularProducts = (catalog ?? [])
    .filter((p) => !dealIds.has(p.id))
    .slice()
    .reverse()
    .slice(0, 10);
  const maxDiscount = dealProducts.length > 0 ? discountPercent(dealProducts[0]) : 0;

  const activeCategoryName = activeCategory ? categories?.find((c) => c.id === activeCategory)?.name : null;
  const gridHeading = activeCategoryName ? activeCategoryName : search ? `Results for "${search}"` : "All groceries";

  function renderProductCard(p: GroceryProduct) {
    const qty = cartQtyFor(p.id);
    const discountPct = discountPercent(p);
    const image = resolveMediaUrl(p.imageUrl);
    return (
      <div key={p.id} className="card-glido overflow-hidden">
        <button
          onClick={() => setGalleryProduct(p)}
          aria-label={`View photos of ${p.name}`}
          className="block w-full aspect-square bg-gray-50 dark:bg-[var(--glido-surface-alt)] relative overflow-hidden"
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
            <span className="text-sm font-bold">₹{qty > 0 ? (p.price * qty).toFixed(2) : p.price}</span>
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
              className="w-full mt-2 text-sm py-1.5 rounded-lg font-bold border-2 transition-colors"
              style={{ borderColor: "var(--glido-grocery)", color: "var(--glido-grocery-dark)" }}
            >
              Add
            </button>
          ) : (
            <div className="flex items-center justify-between mt-2 rounded-lg text-white" style={{ background: "var(--glido-grocery)" }}>
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
  }

  return (
    <div className="pb-28">
      <section className="relative overflow-hidden bg-[var(--glido-hero-bg)]">
        <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: "var(--glido-grocery)" }} />
        <div className="absolute left-1/4 -bottom-16 w-56 h-56 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "var(--glido-accent)" }} />
        <div className="container-glido relative z-10 py-8">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white bg-white/15 border border-white/20 rounded-full px-2.5 py-1 mb-2">
            <Zap size={11} /> Fast delivery
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Groceries, delivered fast</h1>
          <p className="text-sm text-white/80 mt-1">Fruits, dairy, snacks and household essentials.</p>
          <form onSubmit={onSearchSubmit} className="mt-4 flex gap-2 max-w-lg">
            <input
              className="input-glido !border-none shadow-xl"
              placeholder="Search for atta, milk, chips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="shrink-0 rounded-2xl px-5 font-bold text-white shadow-xl transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(120deg, #29d98c, var(--glido-grocery) 60%, var(--glido-grocery-dark))" }}
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <div className="container-glido py-6">
        {maxDiscount > 0 && (
          <a
            href="#deals"
            className="block rounded-3xl p-5 md:p-6 mb-8 relative overflow-hidden text-white shadow-xl transition-transform hover:-translate-y-0.5"
            style={{ background: "linear-gradient(120deg, #29d98c, var(--glido-grocery) 55%, var(--glido-grocery-dark))" }}
          >
            <div className="absolute -right-8 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-white/20 rounded-full px-2 py-1 mb-2">
                  <Zap size={11} /> Flash Sale
                </span>
                <h2 className="text-xl md:text-2xl font-extrabold leading-tight">Up to {maxDiscount}% off</h2>
                <p className="text-xs text-white/80 mt-1">Limited time · while stocks last</p>
              </div>
              <span className="shrink-0 rounded-full bg-white text-[var(--glido-grocery-dark)] text-sm font-bold px-4 py-2">
                Shop Now
              </span>
            </div>
          </a>
        )}

        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid size={16} className="text-[var(--glido-grocery-dark)]" />
            <h2 className="text-base font-bold">Explore Aisle</h2>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            <button onClick={() => setActiveCategory(null)} className="flex flex-col items-center gap-1.5">
              <span
                className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl border-2 ${
                  activeCategory === null ? "border-[var(--glido-grocery)] bg-[var(--glido-grocery-light)]" : "border-[var(--glido-border)] bg-white dark:bg-[var(--glido-surface)]"
                }`}
              >
                <LayoutGrid size={20} className={activeCategory === null ? "text-[var(--glido-grocery-dark)]" : "text-[var(--glido-muted)]"} />
              </span>
              <span className={`text-xs font-medium text-center leading-tight ${activeCategory === null ? "text-[var(--glido-grocery-dark)]" : "text-[var(--glido-muted)]"}`}>
                All
              </span>
            </button>
            {categories?.map((c) => {
              const catImage = resolveMediaUrl(c.imageUrl);
              const active = activeCategory === c.id;
              return (
                <button key={c.id} onClick={() => setActiveCategory(c.id)} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`h-14 w-14 rounded-2xl overflow-hidden flex items-center justify-center text-xl border-2 ${
                      active ? "border-[var(--glido-grocery)]" : "border-[var(--glido-border)]"
                    } ${active ? "bg-[var(--glido-grocery-light)]" : "bg-white dark:bg-[var(--glido-surface)]"}`}
                  >
                    {catImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={catImage} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBasket size={20} className="text-[var(--glido-muted)]" />
                    )}
                  </span>
                  <span className={`text-xs font-medium text-center leading-tight ${active ? "text-[var(--glido-grocery-dark)]" : "text-[var(--glido-muted)]"}`}>
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {catalog === null && (
          <div className="flex gap-3 overflow-x-auto pb-2 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0 card-glido overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-3/4 skeleton" />
                  <div className="h-3 w-1/2 skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {dealProducts.length > 0 && (
          <section id="deals" className="mb-8 scroll-mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[var(--glido-grocery-dark)]" />
                <h2 className="text-base font-bold">Lightning Deals</h2>
              </div>
              <span className="text-xs font-semibold text-[var(--glido-muted)]">Up to {maxDiscount}% off</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {dealProducts.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  {renderProductCard(p)}
                </div>
              ))}
            </div>
          </section>
        )}

        {popularProducts.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[var(--glido-grocery-dark)]" />
              <h2 className="text-base font-bold">Popular Picks</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {popularProducts.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  {renderProductCard(p)}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center gap-2 mb-3">
          <ShoppingBasket size={16} className="text-[var(--glido-grocery-dark)]" />
          <h2 className="text-base font-bold">{gridHeading}</h2>
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
            {products.map((p) => renderProductCard(p))}
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <Link
          href="/grocery/cart"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-xl px-6 py-3 z-30 font-bold text-white transition-transform hover:-translate-y-0.5"
          style={{ background: "var(--glido-grocery)", boxShadow: "0 8px 20px -4px rgba(0,184,115,0.4)" }}
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
