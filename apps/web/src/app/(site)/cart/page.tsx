"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { EmptyState } from "@/components/empty-state";

export default function CartPage() {
  const { cart, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-glido py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse restaurants and add items to get started."
          action={
            <Link href="/food" className="btn-primary">
              Browse restaurants
            </Link>
          }
        />
      </div>
    );
  }

  function goToCheckout() {
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }
    router.push("/checkout");
  }

  return (
    <div className="container-glido py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Your cart</h1>
        <button onClick={clearCart} className="text-sm text-[var(--glido-danger)] font-medium">
          Clear cart
        </button>
      </div>
      <p className="text-sm text-[var(--glido-muted)] mb-4">Ordering from {cart.restaurantName}</p>

      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.menuItemId + item.addonNames.join(",")} className="card-glido p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              {item.addonNames.length > 0 && (
                <p className="text-xs text-[var(--glido-muted)]">+ {item.addonNames.join(", ")}</p>
              )}
              <p className="text-sm font-semibold mt-1">₹{item.price + item.addonsPrice}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                className="h-8 w-8 rounded-lg border border-[var(--glido-border)] font-bold"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                className="h-8 w-8 rounded-lg border border-[var(--glido-border)] font-bold"
              >
                +
              </button>
            </div>
            <button onClick={() => removeItem(item.menuItemId)} className="text-[var(--glido-muted)] hover:text-[var(--glido-danger)]">
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
          Delivery, packaging, taxes and any coupon discount are calculated at checkout.
        </p>
      </div>

      <button onClick={goToCheckout} className="btn-primary w-full mt-4">
        Proceed to checkout
      </button>
    </div>
  );
}
