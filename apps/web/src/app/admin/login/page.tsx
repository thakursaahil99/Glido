"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { GlidoLogo } from "@/components/logo";

function AdminLoginForm() {
  const { passwordLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await passwordLogin(email, password);
      router.push(redirect);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--glido-bg)]">
      <div className="card-glido p-8 w-full max-w-sm">
        <GlidoLogo className="text-xl mb-1" />
        <p className="text-sm text-[var(--glido-muted)] mb-6">Admin Panel</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              className="input-glido mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              className="input-glido mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-sm text-[var(--glido-danger)]">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
