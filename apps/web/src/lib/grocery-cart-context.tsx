"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface GroceryCartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  imageUrl?: string | null;
  quantity: number;
  maxStock: number;
}

interface GroceryCartContextValue {
  items: GroceryCartItem[];
  addItem: (item: Omit<GroceryCartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const GroceryCartContext = createContext<GroceryCartContextValue | null>(null);
const STORAGE_KEY = "glido_grocery_cart_v1";

export function GroceryCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<GroceryCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(STORAGE_KEY);
  }, [items, hydrated]);

  function addItem(item: Omit<GroceryCartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, existing.maxStock);
        return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.maxStock) }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i));
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clearCart, subtotal, itemCount }),
    [items, subtotal, itemCount],
  );

  return <GroceryCartContext.Provider value={value}>{children}</GroceryCartContext.Provider>;
}

export function useGroceryCart() {
  const ctx = useContext(GroceryCartContext);
  if (!ctx) throw new Error("useGroceryCart must be used within GroceryCartProvider");
  return ctx;
}
