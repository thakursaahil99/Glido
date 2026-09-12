"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Clock, IndianRupee } from "lucide-react";
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

  const itemsByCategory = useMemo(() => {
    if (!restaurant?.menuItems) return [];
    const filtered = vegOnly ? restaurant.menuItems.filter((i) => i.isVeg) : restaurant.menuItems;
    const categories = restaurant.menuCategories ?? [];
    const grouped = categories.map((cat) => ({
      category: cat,
      items: filtered.filter((i) => i.categoryId === cat.id),
    }));
    const uncategorized = filtered.filter((i) => !i.categoryId);
    if (uncategorized.length) grouped.push({ category: { id: "none", name: "Other", sortOrder: 999 }, items: uncategorized });
    return grouped.filter((g) => g.items.length > 0);
  }, [restaurant, vegOnly]);

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
      <div className="h-48 md:h-64 bg-gray-100 overflow-hidden">
        {resolveMediaUrl(restaurant.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveMediaUrl(restaurant.imageUrl)} alt={restaurant.name} className="h-full w-full object-cover" />
        ) : null}
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
            <span className="badge badge-status">★ {restaurant.ratingAvg?.toFixed(1) ?? "New"} ({restaurant.ratingCount})</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--glido-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {restaurant.avgDeliveryTimeMin} min delivery
            </span>
            <span className="inline-flex items-center gap-1">
              <IndianRupee size={14} /> {restaurant.deliveryFee} delivery fee
            </span>
            {restaurant.minOrderAmount > 0 && <span>Min order ₹{restaurant.minOrderAmount}</span>}
            {!restaurant.isOpen && <span className="text-[var(--glido-danger)] font-semibold">Currently closed</span>}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="font-bold text-lg">Menu</h2>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
            Veg only
          </label>
        </div>

        {itemsByCategory.length === 0 && (
          <p className="text-sm text-[var(--glido-muted)] py-8">No menu items match this filter yet.</p>
        )}

        <div className="space-y-8 pb-24">
          {itemsByCategory.map(({ category, items }) => (
            <div key={category.id}>
              <h3 className="font-semibold text-[var(--glido-ink)] mb-3">{category.name}</h3>
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

  return (
    <div className="card-glido p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`badge ${item.isVeg ? "badge-veg" : "badge-nonveg"}`}>{item.isVeg ? "Veg" : "Non-veg"}</span>
            {!item.isAvailable && <span className="badge badge-muted">Sold out</span>}
          </div>
          <h4 className="font-medium mt-1">{item.name}</h4>
          {item.description && <p className="text-xs text-[var(--glido-muted)] mt-0.5">{item.description}</p>}
          <p className="text-sm font-semibold mt-1">₹{item.price}</p>

          {item.addons.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-[var(--glido-primary)] font-medium mt-1"
            >
              {expanded ? "Hide add-ons" : `Customize (${item.addons.length} add-ons)`}
            </button>
          )}
          {expanded && (
            <div className="mt-2 space-y-1">
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
        {image && (
          <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={item.name} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <button
        disabled={disabled || !item.isAvailable}
        onClick={() => onAdd(item, selectedAddons)}
        className="btn-secondary mt-3 w-full text-sm disabled:opacity-50"
      >
        {disabled ? "Restaurant closed" : "Add to cart"}
      </button>
    </div>
  );
}
