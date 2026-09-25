"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, X } from "lucide-react";
import { api, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useGroceryCart } from "@/lib/grocery-cart-context";
import { EmptyState } from "@/components/empty-state";
import type { GroceryProduct, Paginated } from "@/lib/types";

export default function GroceryCartPage() {
  const { items, addItem, updateQuantity, removeItem, clearCart, subtotal } = useGroceryCart();
  const { user } = useAuth();
  const router = useRouter();

  const [missed, setMissed] = useState<GroceryProduct[] | null>(null);

  useEffect(() => {
    api
      .get<Paginated<GroceryProduct>>("/grocery/products?pageSize=20")
      .then((res) => setMissed(res.items))
      .catch(() => setMissed([]));
  }, []);

  const inCartIds = new Set(items.map((i) => i.productId));
  const missedSuggestions = (missed ?? []).filter((p) => !inCartIds.has(p.id) && p.stockQty > 0).slice(0, 8);

  if (items.length === 0) {
    return (
      <div className="container-glido py-8">
        <EmptyState
          icon={ShoppingCart}
          title="Your grocery cart is empty"
          description="Browse products and add items to get started."
          action={
            <Link href="/grocery" className="btn-primary">
              Browse groceries
            </Link>
          }
        />
      </div>
    );
  }

  function goToCheckout() {
    if (!user) {
      router.push("/login?redirect=/grocery/checkout");
      return;
    }
    router.push("/grocery/checkout");
  }

  return (
    <div className="container-glido py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your grocery cart</h1>
        <button onClick={clearCart} className="text-sm text-[var(--glido-danger)] font-medium">
          Clear cart
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="card-glido p-4 flex items-center gap-3">
            <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-[var(--glido-surface-alt)] overflow-hidden shrink-0">
              {resolveMediaUrl(item.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ShoppingCart size={20} className="text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-[var(--glido-muted)]">{item.unit}</p>
              <p className="text-sm font-semibold mt-1">₹{item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="h-8 w-8 rounded-lg border border-[var(--glido-border)] font-bold"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button
                disabled={item.quantity >= item.maxStock}
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="h-8 w-8 rounded-lg border border-[var(--glido-border)] font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button onClick={() => removeItem(item.productId)} className="text-[var(--glido-muted)] hover:text-[var(--glido-danger)]">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {missedSuggestions.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3">Missed something?</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {missedSuggestions.map((p) => {
              const image = resolveMediaUrl(p.imageUrl);
              return (
                <div key={p.id} className="card-glido p-2.5 w-32 shrink-0">
                  <div className="aspect-square rounded-lg bg-gray-50 dark:bg-[var(--glido-surface-alt)] overflow-hidden mb-2">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingCart size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-tight line-clamp-2 h-8">{p.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold">₹{p.price}</span>
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
                      aria-label={`Add ${p.name}`}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: "var(--glido-grocery)" }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-glido p-4 mt-6">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--glido-muted)]">Subtotal</span>
          <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-[var(--glido-muted)] mt-1">
          Delivery is free above ₹299 (₹25 otherwise). Tax calculated at checkout.
        </p>
      </div>

      <button onClick={goToCheckout} className="btn-primary w-full mt-4">
        Proceed to checkout
      </button>
    </div>
  );
}
