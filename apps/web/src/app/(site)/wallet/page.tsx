"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Gift, Sparkles, Wallet as WalletIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { ReferralSummary, WalletSummary, WalletTransaction } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

export default function WalletPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [referral, setReferral] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [addingAmount, setAddingAmount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  async function load() {
    setError(null);
    try {
      const [s, t, r] = await Promise.all([
        api.get<WalletSummary>("/wallet/me"),
        api.get<{ items: WalletTransaction[] }>("/wallet/me/transactions?pageSize=30"),
        api.get<ReferralSummary>("/users/me/referral"),
      ]);
      setSummary(s);
      setTransactions(t.items);
      setReferral(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your wallet.");
    }
  }

  function copyReferralCode() {
    if (!referral) return;
    navigator.clipboard.writeText(referral.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function redeemLoyaltyPoints() {
    const points = Number(redeemPoints);
    if (!points || points <= 0) return;
    setRedeeming(true);
    try {
      const res = await api.post<{ redeemedPoints: number; creditedAmount: number }>("/users/me/loyalty/redeem", { points });
      show(`₹${res.creditedAmount.toFixed(2)} credited to your wallet`, "success");
      setRedeemPoints("");
      refreshUser();
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not redeem points.", "error");
    } finally {
      setRedeeming(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/wallet");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function addMoney(amount: number) {
    if (amount <= 0) return;
    setAddingAmount(amount);
    try {
      await api.post("/wallet/me/topup", { amount });
      show(`₹${amount.toFixed(2)} added to your wallet`, "success");
      setCustomAmount("");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not add money.", "error");
    } finally {
      setAddingAmount(null);
    }
  }

  if (authLoading || !user) return null;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="container-glido py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Glido Wallet</h1>

      <div className="card-glido p-5 mb-4 bg-gradient-to-br from-[var(--glido-primary)] to-[var(--glido-primary-dark)] text-white border-0">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <WalletIcon size={16} /> Available balance
        </div>
        <p className="text-3xl font-bold mt-1">
          {summary ? `₹${summary.balance.toFixed(2)}` : <span className="inline-block h-8 w-32 skeleton" />}
        </p>
      </div>

      <section className="card-glido p-4 mb-4">
        <h2 className="font-semibold mb-3">Add money</h2>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => addMoney(amt)}
              disabled={addingAmount !== null}
              className="btn-secondary text-sm !py-2 disabled:opacity-50"
            >
              ₹{amt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input-glido"
            type="number"
            min={1}
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          <button
            onClick={() => addMoney(Number(customAmount))}
            disabled={addingAmount !== null || !customAmount || Number(customAmount) <= 0}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            {addingAmount ? "Adding..." : "Add"}
          </button>
        </div>
        <p className="text-xs text-[var(--glido-muted)] mt-2">
          Instant top-up — added to your wallet right away.
        </p>
      </section>

      <section className="card-glido p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={18} className="text-[var(--glido-primary)]" />
          <h2 className="font-semibold">Refer & earn</h2>
        </div>
        <p className="text-sm text-[var(--glido-muted)] mb-3">
          Share your code — your friend gets ₹50, you get ₹100 when they join.
        </p>
        {referral ? (
          <>
            <div className="flex gap-2 mb-3">
              <code className="flex-1 input-glido flex items-center font-mono text-sm tracking-wide bg-gray-50 dark:bg-[var(--glido-surface-alt)]">
                {referral.referralCode}
              </code>
              <button onClick={copyReferralCode} className="btn-secondary shrink-0 flex items-center gap-1.5 text-sm">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex gap-4 text-sm text-[var(--glido-muted)]">
              <span>
                <strong className="text-[var(--glido-ink)]">{referral.referredCount}</strong> friend{referral.referredCount === 1 ? "" : "s"} joined
              </span>
              <span>
                <strong className="text-[var(--glido-ink)]">₹{referral.totalEarned.toFixed(2)}</strong> earned
              </span>
            </div>
          </>
        ) : (
          <div className="h-16 skeleton" />
        )}
      </section>

      <section className="card-glido p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-[var(--glido-accent)]" />
          <h2 className="font-semibold">Loyalty points</h2>
        </div>
        <p className="text-sm text-[var(--glido-muted)] mb-3">
          Earn 1 point per ₹10 spent on delivered orders. Redeem points 1:1 into your wallet.
        </p>
        <p className="text-2xl font-bold mb-3">{user?.loyaltyPoints ?? 0} pts</p>
        <div className="flex gap-2">
          <input
            className="input-glido"
            type="number"
            min={1}
            max={user?.loyaltyPoints ?? 0}
            placeholder="Points to redeem"
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
          />
          <button
            onClick={redeemLoyaltyPoints}
            disabled={redeeming || !redeemPoints || Number(redeemPoints) <= 0}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            {redeeming ? "Redeeming..." : "Redeem"}
          </button>
        </div>
      </section>

      <section className="card-glido p-4">
        <h2 className="font-semibold mb-3">Transaction history</h2>
        {transactions === null && <div className="h-24 skeleton" />}
        {transactions && transactions.length === 0 && (
          <EmptyState icon={WalletIcon} title="No transactions yet" description="Add money or pay with your wallet to see activity here." />
        )}
        {transactions && transactions.length > 0 && (
          <div className="space-y-1">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--glido-border)] last:border-0">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    t.type === "CREDIT" ? "bg-[var(--glido-success-light)] text-[var(--glido-success)]" : "bg-[var(--glido-danger-light)] text-[var(--glido-danger)]"
                  }`}
                >
                  {t.type === "CREDIT" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.reason}</p>
                  <p className="text-xs text-[var(--glido-muted)]">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <p className={`font-semibold text-sm shrink-0 ${t.type === "CREDIT" ? "text-[var(--glido-success)]" : "text-[var(--glido-danger)]"}`}>
                  {t.type === "CREDIT" ? "+" : "−"}₹{t.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
