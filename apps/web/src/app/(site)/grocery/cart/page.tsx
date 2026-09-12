"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, X } from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useGroceryCart } from "@/lib/grocery-cart-context";
import { EmptyState } from "@/components/empty-state";

export default function GroceryCartPage() {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useGroceryCart();
  const { user } = useAuth();
  const router = useRouter();

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
            <div className="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
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
