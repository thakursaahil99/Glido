"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface CartLineItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  addonNames: string[];
  addonsPrice: number;
  isVeg: boolean;
  imageUrl?: string | null;
}

export interface Cart {
  restaurantId: string;
  restaurantName: string;
  items: CartLineItem[];
}

interface CartContextValue {
  cart: Cart | null;
  hasDifferentRestaurantItems: (restaurantId: string) => boolean;
  addItem: (restaurantId: string, restaurantName: string, item: CartLineItem) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "glido_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignore corrupt cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (cart) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    else localStorage.removeItem(STORAGE_KEY);
  }, [cart, hydrated]);

  const hasDifferentRestaurantItems = (restaurantId: string) =>
    !!cart && cart.restaurantId !== restaurantId && cart.items.length > 0;

  const addItem: CartContextValue["addItem"] = (restaurantId, restaurantName, item) => {
    setCart((prev) => {
      if (!prev || prev.restaurantId !== restaurantId) {
        return { restaurantId, restaurantName, items: [item] };
      }
      const existingIndex = prev.items.findIndex(
        (i) => i.menuItemId === item.menuItemId && i.addonNames.join(",") === item.addonNames.join(","),
      );
      if (existingIndex >= 0) {
        const items = [...prev.items];
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: items[existingIndex].quantity + item.quantity,
        };
        return { ...prev, items };
      }
      return { ...prev, items: [...prev.items, item] };
    });
  };

  const updateQuantity: CartContextValue["updateQuantity"] = (menuItemId, quantity) => {
    setCart((prev) => {
      if (!prev) return prev;
      if (quantity <= 0) {
        const items = prev.items.filter((i) => i.menuItemId !== menuItemId);
        return items.length ? { ...prev, items } : null;
      }
      return { ...prev, items: prev.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i)) };
    });
  };

  const removeItem: CartContextValue["removeItem"] = (menuItemId) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((i) => i.menuItemId !== menuItemId);
      return items.length ? { ...prev, items } : null;
    });
  };

  const clearCart = () => setCart(null);

  const subtotal = useMemo(
    () => cart?.items.reduce((sum, i) => sum + (i.price + i.addonsPrice) * i.quantity, 0) ?? 0,
    [cart],
  );
  const itemCount = useMemo(() => cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0, [cart]);

  // The handler functions below close over `cart` directly and are cheap to recreate each render;
  // only re-memoizing on these keeps this simple without wrapping every handler in useCallback.
  /* eslint-disable react-hooks/exhaustive-deps */
  const value = useMemo(
    () => ({ cart, hasDifferentRestaurantItems, addItem, updateQuantity, removeItem, clearCart, subtotal, itemCount }),
    [cart, subtotal, itemCount],
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
