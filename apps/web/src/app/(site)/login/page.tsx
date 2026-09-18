"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { GoogleSignInButton } from "@/components/google-signin-button";

function LoginForm() {
  const { register, login, googleLogin } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const refFromUrl = searchParams.get("ref") ?? "";

  const [mode, setMode] = useState<"login" | "signup">(refFromUrl ? "signup" : "login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGoogleToken(idToken: string) {
    setError(null);
    setLoading(true);
    try {
      await googleLogin(idToken, referralCode);
      show("Welcome to Glido!", "success");
      router.push(redirect);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await register(name, identifier, password, referralCode);
        show("Welcome to Glido!", "success");
      } else {
        await login(identifier, password);
        show("Welcome back!", "success");
      }
      router.push(redirect);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-glido max-w-sm py-16">
      <h1 className="text-2xl font-bold mb-1">{mode === "login" ? "Log in to Glido" : "Create your account"}</h1>
      <p className="text-sm text-[var(--glido-muted)] mb-6">
        {mode === "login" ? "Welcome back — enter your details to continue." : "Just a few details to get started."}
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <label className="block text-sm font-medium">
            Full name
            <input
              className="input-glido mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email or phone
          <input
            className="input-glido mt-1"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com"
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
            placeholder="••••••••"
            minLength={6}
            required
          />
        </label>
        {mode === "signup" && (
          <label className="block text-sm font-medium">
            Referral code <span className="font-normal text-[var(--glido-muted)]">(optional)</span>
            <input
              className="input-glido mt-1"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Friend's referral code"
            />
          </label>
        )}
        {error && <p className="text-sm text-[var(--glido-danger)]">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
        className="text-sm text-[var(--glido-primary)] font-medium mt-4"
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-[var(--glido-border)]" />
        <span className="text-xs text-[var(--glido-muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--glido-border)]" />
      </div>
      <GoogleSignInButton onToken={onGoogleToken} />

      <p className="text-xs text-[var(--glido-muted)] mt-6">
        Demo customer account: <code>customer@glido.app</code> / <code>Customer@123</code>. Looking
        for the admin panel?{" "}
        <a href="/admin/login" className="underline">
          Sign in here
        </a>
        .
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
