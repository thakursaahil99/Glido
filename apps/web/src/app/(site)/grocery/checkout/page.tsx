"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useGroceryCart } from "@/lib/grocery-cart-context";
import { useToast } from "@/lib/toast-context";
import { PhoneRequiredField } from "@/components/phone-required-field";
import type { Address, GroceryOrder, PlatformSettings, WalletSummary } from "@/lib/types";

export default function GroceryCheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, clearCart } = useGroceryCart();
  const { show } = useToast();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", line1: "", line2: "", pincode: "" });

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [presetInstructions, setPresetInstructions] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [tip, setTip] = useState(0);
  const [customTipOpen, setCustomTipOpen] = useState(false);
  const [customTip, setCustomTip] = useState("");
  const [placing, setPlacing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "WALLET">("COD");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  async function loadAddresses() {
    try {
      const res = await api.get<Address[]>("/users/me/addresses");
      setAddresses(res);
      const def = res.find((a) => a.isDefault) ?? res[0];
      if (def) setSelectedAddressId(def.id);
      if (res.length === 0) setShowAddAddress(true);
    } catch {
      setAddresses([]);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/grocery/checkout");
      return;
    }
    if (items.length === 0) {
      router.push("/grocery/cart");
      return;
    }
    loadAddresses();
    api
      .get<WalletSummary>("/wallet/me")
      .then(setWallet)
      .catch(() => undefined);
    api
      .get<PlatformSettings>("/settings")
      .then(setSettings)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await api.post<Address>("/users/me/addresses", { ...newAddress, isDefault: true });
      setAddresses((prev) => [...(prev ?? []), created]);
      setSelectedAddressId(created.id);
      setShowAddAddress(false);
      show("Address saved", "success");
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not save address.", "error");
    }
  }

  const deliveryFee = subtotal >= (settings?.groceryFreeDeliveryThreshold ?? 299) ? 0 : (settings?.groceryDeliveryFee ?? 25);
  const taxRate = (settings?.taxRatePercent ?? 5) / 100;
  const estimatedTax = Math.round(subtotal * taxRate * 100) / 100;
  const estimatedTotal = useMemo(
    () => Math.max(0, subtotal + deliveryFee + estimatedTax + tip - (couponDiscount ?? 0)),
    [subtotal, deliveryFee, estimatedTax, tip, couponDiscount],
  );

  const PRESET_INSTRUCTIONS = ["Avoid calling", "Leave at door", "Don't ring bell", "Leave with guard"];
  function togglePreset(label: string) {
    setPresetInstructions((prev) => (prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]));
  }
  function composedInstructions() {
    return [...presetInstructions, instructions.trim()].filter(Boolean).join(", ") || undefined;
  }

  async function applyCoupon() {
    if (!couponCode) return;
    setCouponError(null);
    try {
      const res = await api.post<{ valid: boolean; discount: number }>("/coupons/validate", {
        code: couponCode,
        subtotal,
      });
      setCouponDiscount(res.discount);
      show(`Coupon applied — ₹${res.discount} off`, "success");
    } catch (e) {
      setCouponDiscount(null);
      setCouponError(e instanceof ApiError ? e.message : "Invalid coupon.");
    }
  }

  async function placeOrder() {
    if (!selectedAddressId) return;
    setFormError(null);
    setPlacing(true);
    try {
      const order = await api.post<GroceryOrder>("/grocery/orders", {
        addressId: selectedAddressId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: couponDiscount ? couponCode : undefined,
        deliveryInstructions: composedInstructions(),
        tipAmount: tip || undefined,
        paymentMethod,
      });
      clearCart();
      show(paymentMethod === "WALLET" ? "Paid from wallet. Order placed!" : "Order placed!", "success");
      router.push(`/grocery/orders/${order.id}`);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Could not place order.");
    } finally {
      setPlacing(false);
    }
  }

  if (authLoading || items.length === 0) return null;

  return (
    <div className="container-glido py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <PhoneRequiredField />

      <section className="card-glido p-4 mb-4">
        <h2 className="font-semibold mb-3">Delivery address</h2>
        {addresses === null && <div className="h-16 skeleton" />}
        {addresses && addresses.length > 0 && !showAddAddress && (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className="flex items-start gap-2 p-3 border border-[var(--glido-border)] rounded-lg cursor-pointer has-[:checked]:border-[var(--glido-primary)] has-[:checked]:bg-[var(--glido-primary-light)]"
              >
                <input
                  type="radio"
                  name="address"
                  className="mt-1"
                  checked={selectedAddressId === a.id}
                  onChange={() => setSelectedAddressId(a.id)}
                />
                <span className="text-sm">
                  <strong>{a.label}</strong> — {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""} {a.pincode}
                </span>
              </label>
            ))}
            <button onClick={() => setShowAddAddress(true)} className="text-sm text-[var(--glido-primary)] font-medium">
              + Add new address
            </button>
          </div>
        )}
        {showAddAddress && (
          <form onSubmit={saveAddress} className="space-y-2">
            <input
              className="input-glido"
              placeholder="Label (e.g. Home, Work)"
              value={newAddress.label}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
            />
            <input
              className="input-glido"
              placeholder="Address line 1"
              required
              value={newAddress.line1}
              onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
            />
            <input
              className="input-glido"
              placeholder="Address line 2 (optional)"
              value={newAddress.line2}
              onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
            />
            <input
              className="input-glido"
              placeholder="Pincode"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={newAddress.pincode}
              onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\D/g, "") })}
            />
            <div className="flex gap-2">
              <button className="btn-primary" type="submit">
                Save address
              </button>
              {addresses && addresses.length > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setShowAddAddress(false)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="card-glido p-4 mb-4">
        <h2 className="font-semibold mb-3">Payment method</h2>
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2 p-3 border border-[var(--glido-border)] rounded-lg cursor-pointer has-[:checked]:border-[var(--glido-primary)] has-[:checked]:bg-[var(--glido-primary-light)]">
            <span className="flex items-center gap-2">
              <input type="radio" checked={paymentMethod === "WALLET"} onChange={() => setPaymentMethod("WALLET")} />
              <span className="text-sm font-medium">Glido Wallet</span>
            </span>
            <span className="text-xs text-[var(--glido-muted)]">₹{(wallet?.balance ?? 0).toFixed(2)} available</span>
          </label>
          <label className="flex items-center gap-2 p-3 border border-[var(--glido-border)] rounded-lg cursor-pointer has-[:checked]:border-[var(--glido-primary)] has-[:checked]:bg-[var(--glido-primary-light)]">
            <input type="radio" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
            <span className="text-sm font-medium">Cash on delivery</span>
          </label>
        </div>
        {paymentMethod === "WALLET" && wallet != null && wallet.balance < estimatedTotal && (
          <p className="text-xs text-[var(--glido-danger)] mt-2">
            Insufficient wallet balance. <Link href="/wallet" className="underline font-medium">Add money</Link> or choose another method.
          </p>
        )}
        <p className="text-xs text-[var(--glido-muted)] mt-2">Online (card/UPI) payment for Grocery is coming soon.</p>
      </section>

      <section className="card-glido p-4 mb-4">
        <h2 className="font-semibold mb-3">Coupon</h2>
        <div className="flex gap-2">
          <input
            className="input-glido"
            placeholder="Enter coupon code"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setCouponDiscount(null);
            }}
          />
          <button onClick={applyCoupon} className="btn-secondary shrink-0" type="button">
            Apply
          </button>
        </div>
        {couponError && <p className="text-sm text-[var(--glido-danger)] mt-2">{couponError}</p>}
        {couponDiscount != null && <p className="text-sm text-[var(--glido-primary-dark)] mt-2">₹{couponDiscount} discount applied</p>}
      </section>

      <section className="card-glido p-4 mb-4">
        <h2 className="font-semibold mb-3">Delivery instructions (optional)</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_INSTRUCTIONS.map((label) => {
            const active = presetInstructions.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => togglePreset(label)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                style={
                  active
                    ? { background: "var(--glido-grocery-light)", borderColor: "var(--glido-grocery)", color: "var(--glido-grocery-dark)" }
                    : { borderColor: "var(--glido-border)", color: "var(--glido-muted)" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <textarea
          className="input-glido"
          rows={2}
          placeholder="Anything else? (optional)"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </section>

      <section className="card-glido p-4 mb-4">
        <h2 className="font-semibold mb-3">Tip your delivery hero</h2>
        <p className="text-xs text-[var(--glido-muted)] mb-3">100% goes to your delivery partner. Totally optional.</p>
        <div className="flex flex-wrap gap-2">
          {[20, 30, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setTip(tip === amount ? 0 : amount);
                setCustomTipOpen(false);
              }}
              className="px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors"
              style={
                tip === amount
                  ? { background: "var(--glido-grocery)", borderColor: "var(--glido-grocery)", color: "white" }
                  : { borderColor: "var(--glido-border)", color: "var(--glido-ink)" }
              }
            >
              +₹{amount}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomTipOpen((v) => !v)}
            className="px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors"
            style={
              customTipOpen || (tip > 0 && ![20, 30, 50].includes(tip))
                ? { background: "var(--glido-grocery)", borderColor: "var(--glido-grocery)", color: "white" }
                : { borderColor: "var(--glido-border)", color: "var(--glido-ink)" }
            }
          >
            Custom
          </button>
          {tip > 0 && (
            <button type="button" onClick={() => { setTip(0); setCustomTip(""); setCustomTipOpen(false); }} className="px-3 py-2 text-sm font-semibold text-[var(--glido-danger)]">
              Remove
            </button>
          )}
        </div>
        {customTipOpen && (
          <div className="flex gap-2 mt-3">
            <input
              className="input-glido"
              type="number"
              min={1}
              placeholder="Enter amount"
              value={customTip}
              onChange={(e) => {
                setCustomTip(e.target.value);
                const n = Number(e.target.value);
                setTip(Number.isFinite(n) && n > 0 ? n : 0);
              }}
            />
          </div>
        )}
      </section>

      <section className="card-glido p-4 mb-4 text-sm">
        <h2 className="font-semibold mb-3">Order summary</h2>
        <div className="space-y-3 mb-3 pb-3 border-b border-[var(--glido-border)]">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-gray-100 dark:bg-[var(--glido-surface-alt)] overflow-hidden shrink-0">
                {resolveMediaUrl(item.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingCart size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {item.quantity} × {item.name}
                </p>
                <p className="text-xs text-[var(--glido-muted)]">{item.unit}</p>
              </div>
              <p className="font-medium shrink-0">₹{(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Delivery fee</span><span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee.toFixed(2)}`}</span></div>
          <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Taxes (est.)</span><span>₹{estimatedTax.toFixed(2)}</span></div>
          {tip > 0 && (
            <div className="flex justify-between"><span className="text-[var(--glido-muted)]">Delivery tip</span><span>₹{tip.toFixed(2)}</span></div>
          )}
          {couponDiscount != null && (
            <div className="flex justify-between text-[var(--glido-primary-dark)]"><span>Coupon discount</span><span>−₹{couponDiscount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--glido-border)] mt-2">
            <span>Total</span><span>₹{estimatedTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {formError && <p className="text-sm text-[var(--glido-danger)] mb-3">{formError}</p>}

      <button
        onClick={placeOrder}
        disabled={placing || !user?.phone || !selectedAddressId || (paymentMethod === "WALLET" && (wallet?.balance ?? 0) < estimatedTotal)}
        className="btn-primary w-full"
      >
        {placing ? "Placing order..." : `Place order · ₹${estimatedTotal.toFixed(2)}`}
      </button>
    </div>
  );
}
