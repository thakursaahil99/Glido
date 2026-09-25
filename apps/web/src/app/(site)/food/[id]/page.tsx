"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, IndianRupee, Leaf, Search, Sparkles, Star } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import type { MenuItem, Restaurant } from "@/lib/types";
import { ErrorState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/modal";

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { cart, hasDifferentRestaurantItems, addItem } = useCart();
  const { show } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [pendingItem, setPendingItem] = useState<{ item: MenuItem; addons: string[] } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Restaurant>(`/restaurants/${id}`);
      setRestaurant(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this restaurant.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vegFiltered = useMemo(() => {
    if (!restaurant?.menuItems) return [];
    return vegOnly ? restaurant.menuItems.filter((i) => i.isVeg) : restaurant.menuItems;
  }, [restaurant, vegOnly]);

  const itemsByCategory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const filtered = q ? vegFiltered.filter((i) => i.name.toLowerCase().includes(q)) : vegFiltered;
    const categories = restaurant?.menuCategories ?? [];
    const grouped = categories.map((cat) => ({
      category: cat,
      items: filtered.filter((i) => i.categoryId === cat.id),
    }));
    const uncategorized = filtered.filter((i) => !i.categoryId);
    if (uncategorized.length) grouped.push({ category: { id: "none", name: "Other", sortOrder: 999 }, items: uncategorized });
    return grouped.filter((g) => g.items.length > 0);
  }, [restaurant, vegFiltered, itemSearch]);

  // "Chef's Must Try": a defensible, honest discovery row. Prefer items that have
  // add-ons (they're customizable/signature dishes), falling back to the first few
  // menu items when there isn't enough add-on signal. No fabricated bestseller flag.
  const featuredItems = useMemo(() => {
    const available = vegFiltered.filter((i) => i.isAvailable);
    const withAddons = available.filter((i) => i.addons.length > 0);
    const base = withAddons.length >= 3 ? withAddons : available;
    return base.slice(0, 6);
  }, [vegFiltered]);

  function confirmAdd(item: MenuItem, addonNames: string[] = []) {
    if (!restaurant) return;
    if (hasDifferentRestaurantItems(restaurant.id)) {
      setPendingItem({ item, addons: addonNames });
      return;
    }
    doAdd(item, addonNames);
  }

  function doAdd(item: MenuItem, addonNames: string[]) {
    if (!restaurant) return;
    const chosenAddons = item.addons.filter((a) => addonNames.includes(a.name));
    const addonsPrice = chosenAddons.reduce((sum, a) => sum + a.price, 0);
    addItem(restaurant.id, restaurant.name, {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      addonNames,
      addonsPrice,
      isVeg: item.isVeg,
      imageUrl: item.imageUrl,
    });
    show(`Added ${item.name} to cart`, "success");
  }

  if (loading) {
    return (
      <div className="container-glido py-8 space-y-4">
        <div className="h-40 skeleton" />
        <div className="h-6 w-1/2 skeleton" />
        <div className="h-4 w-1/3 skeleton" />
      </div>
    );
  }

  if (error || !restaurant) {
    return <ErrorState message={error ?? "Restaurant not found."} onRetry={load} />;
  }

  return (
    <div>
      <div className="h-48 md:h-64 bg-[var(--glido-hero-bg)] overflow-hidden relative">
        {resolveMediaUrl(restaurant.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveMediaUrl(restaurant.imageUrl)} alt={restaurant.name} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        <Link
          href="/food"
          aria-label="Back to restaurants"
          className="absolute top-3 left-3 h-10 w-10 rounded-full bg-white dark:bg-[var(--glido-surface)] shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[var(--glido-surface-alt)]"
        >
          <ArrowLeft size={18} className="text-[var(--glido-ink)]" />
        </Link>
        {!restaurant.isOpen && (
          <span className="absolute top-3 right-3 badge bg-black/60 text-white">Closed now</span>
        )}
      </div>

      <div className="container-glido -mt-8 relative">
        <div className="card-glido p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              {restaurant.cuisineTags && (
                <p className="text-sm text-[var(--glido-muted)] mt-1">{restaurant.cuisineTags}</p>
              )}
              {restaurant.description && (
                <p className="text-sm text-[var(--glido-muted)] mt-1 max-w-xl">{restaurant.description}</p>
              )}
            </div>
            <span className="badge bg-[var(--glido-success)] text-white shrink-0 inline-flex items-center gap-1">
              <Star size={12} fill="currentColor" /> {restaurant.ratingAvg?.toFixed(1) ?? "New"} ({restaurant.ratingCount})
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--glido-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {restaurant.avgDeliveryTimeMin} min delivery
            </span>
            <span className="inline-flex items-center gap-1">
              <IndianRupee size={14} /> {restaurant.deliveryFee === 0 ? "Free delivery" : `₹${restaurant.deliveryFee} delivery fee`}
            </span>
            {restaurant.minOrderAmount > 0 && <span>Min order ₹{restaurant.minOrderAmount}</span>}
            {!restaurant.isOpen && <span className="text-[var(--glido-danger)] font-semibold">Currently closed</span>}
          </div>
        </div>

        {featuredItems.length >= 2 && (
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[var(--glido-food-dark)]" />
              <h2 className="text-base font-bold">Chef&apos;s Must Try</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {featuredItems.map((item) => {
                const image = resolveMediaUrl(item.imageUrl);
                return (
                  <button
                    key={item.id}
                    onClick={() => confirmAdd(item)}
                    disabled={!restaurant.isOpen || !item.isAvailable}
                    className="w-40 shrink-0 card-glido overflow-hidden text-left disabled:opacity-50"
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-[var(--glido-surface-alt)] overflow-hidden">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <VegIcon isVeg={item.isVeg} large />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <VegIcon isVeg={item.isVeg} />
                      <p className="text-sm font-medium leading-tight mt-1 line-clamp-2">{item.name}</p>
                      <p className="text-xs font-semibold mt-1">₹{item.price}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-6 mb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-bold text-lg">Menu</h2>
            <button
              onClick={() => setVegOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                vegOnly
                  ? "bg-[var(--glido-success)] text-white border-[var(--glido-success)]"
                  : "bg-white dark:bg-[var(--glido-surface)] text-[var(--glido-muted)] border-[var(--glido-border)]"
              }`}
            >
              <Leaf size={13} /> Veg only
            </button>
          </div>
          <div className="relative mt-3 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--glido-muted)]" />
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search in menu..."
              className="input-glido !pl-9 !py-2 text-sm"
            />
          </div>
        </div>

        {itemsByCategory.length > 1 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {itemsByCategory.map(({ category }) => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border bg-white dark:bg-[var(--glido-surface)] text-[var(--glido-muted)] border-[var(--glido-border)] hover:border-[var(--glido-food)] hover:text-[var(--glido-food-dark)]"
              >
                {category.name}
              </a>
            ))}
          </div>
        )}

        {itemsByCategory.length === 0 && (
          <p className="text-sm text-[var(--glido-muted)] py-8">No menu items match this filter yet.</p>
        )}

        <div className="space-y-8 pb-24">
          {itemsByCategory.map(({ category, items }) => (
            <div key={category.id} id={`cat-${category.id}`} className="scroll-mt-20">
              <h3 className="font-semibold text-[var(--glido-ink)] mb-3">
                {category.name} <span className="text-[var(--glido-muted)] font-normal">({items.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <MenuItemRow key={item.id} item={item} disabled={!restaurant.isOpen} onAdd={confirmAdd} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {cart && cart.items.length > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 btn-primary shadow-lg px-6 z-30"
        >
          View cart · {cart.items.reduce((s, i) => s + i.quantity, 0)} items
        </Link>
      )}

      <ConfirmDialog
        open={!!pendingItem}
        title="Start a new cart?"
        description={`Your cart has items from ${cart?.restaurantName}. Adding from ${restaurant.name} will clear it.`}
        confirmLabel="Clear cart & add"
        danger
        onCancel={() => setPendingItem(null)}
        onConfirm={() => {
          if (pendingItem) doAdd(pendingItem.item, pendingItem.addons);
          setPendingItem(null);
        }}
      />
    </div>
  );
}

function MenuItemRow({
  item,
  disabled,
  onAdd,
}: {
  item: MenuItem;
  disabled: boolean;
  onAdd: (item: MenuItem, addonNames: string[]) => void;
}) {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  function toggleAddon(name: string) {
    setSelectedAddons((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  const image = resolveMediaUrl(item.imageUrl);
  const canAdd = !disabled && item.isAvailable;

  return (
    <div className="card-glido p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <VegIcon isVeg={item.isVeg} />
            {!item.isAvailable && <span className="badge badge-muted">Sold out</span>}
          </div>
          <h4 className="font-medium mt-1.5">{item.name}</h4>
          <p className="text-sm font-semibold mt-1">₹{item.price}</p>
          {item.description && <p className="text-xs text-[var(--glido-muted)] mt-1">{item.description}</p>}

          {item.addons.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-[var(--glido-food-dark)] font-semibold mt-2"
            >
              {expanded ? "Hide add-ons" : `Customize (${item.addons.length} add-ons)`}
            </button>
          )}
          {expanded && (
            <div className="mt-2 space-y-1 border-t border-[var(--glido-border)] pt-2">
              {item.addons.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(a.name)}
                    onChange={() => toggleAddon(a.name)}
                  />
                  {a.name} {a.price > 0 && `(+₹${a.price})`}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 relative">
          <div className="h-24 w-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-[var(--glido-surface-alt)] flex items-center justify-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <VegIcon isVeg={item.isVeg} large />
            )}
          </div>
          <button
            disabled={!canAdd}
            onClick={() => onAdd(item, selectedAddons)}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-1.5 text-xs font-bold shadow-md border bg-white dark:bg-[var(--glido-surface)] text-[var(--glido-food-dark)] border-[var(--glido-border)] disabled:opacity-50 whitespace-nowrap"
          >
            {disabled ? "Closed" : "ADD"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VegIcon({ isVeg, large }: { isVeg: boolean; large?: boolean }) {
  const size = large ? "h-8 w-8" : "h-4 w-4";
  const dot = large ? "h-3.5 w-3.5" : "h-1.5 w-1.5";
  // Inline styles here (not Tailwind arbitrary-value classes) so the color is applied
  // reliably regardless of JIT class-detection edge cases with these CSS variables.
  const colorVar = isVeg ? "var(--glido-success)" : "var(--glido-danger)";
  return (
    <span
      className={`inline-flex items-center justify-center ${size} border-2 ${large ? "rounded-lg" : "rounded-sm"}`}
      style={{ borderColor: colorVar }}
      aria-label={isVeg ? "Veg" : "Non-veg"}
      title={isVeg ? "Veg" : "Non-veg"}
    >
      <span className={`${dot} rounded-full`} style={{ background: colorVar }} />
    </span>
  );
}
