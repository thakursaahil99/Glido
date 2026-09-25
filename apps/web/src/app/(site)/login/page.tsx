"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { AnimatedSignInShell, AnimatedForm } from "@/components/ui/animated-sign-in";
import {
  Pizza,
  Soup,
  Sandwich,
  ShoppingBasket,
  Carrot,
  Apple,
  Car,
  CarTaxiFront,
} from "lucide-react";

const orbitItems = [
  { icon: Pizza, module: "food" as const },
  { icon: ShoppingBasket, module: "grocery" as const },
  { icon: Car, module: "cab" as const },
  { icon: Soup, module: "food" as const },
  { icon: Carrot, module: "grocery" as const },
  { icon: CarTaxiFront, module: "cab" as const },
  { icon: Sandwich, module: "food" as const },
  { icon: Apple, module: "grocery" as const },
];

type Mode = "login" | "signup" | "forgot" | "reset";

function GoogleDivider({ onToken }: { onToken: (idToken: string) => void }) {
  return (
    <>
      <GoogleSignInButton onToken={onToken} />
      <div className="my-1 flex items-center gap-4">
        <hr className="flex-1 border-dashed border-[var(--glido-border)]" />
        <p className="text-sm text-[var(--glido-muted)]">or</p>
        <hr className="flex-1 border-dashed border-[var(--glido-border)]" />
      </div>
    </>
  );
}

function ModeSwitchFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-4 text-center">
      <button type="button" onClick={onClick} className="text-sm font-medium text-[var(--glido-primary)]">
        {label}
      </button>
    </div>
  );
}

function LoginForm() {
  const { register, login, googleLogin } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const refFromUrl = searchParams.get("ref") ?? "";

  const [mode, setMode] = useState<Mode>(refFromUrl ? "signup" : "login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function resetToLogin() {
    setMode("login");
    setError(null);
  }

  async function onRequestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password/reset-request", { identifier });
      show("If an account exists, a reset code has been sent.", "success");
      setMode("reset");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password/reset", { identifier, code: resetCode, newPassword });
      show("Password updated — please log in.", "success");
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setMode("login");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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

  let form: React.ReactNode;

  if (mode === "forgot") {
    form = (
      <AnimatedForm
        header="Reset your password"
        subHeader="Enter the email or phone on your account — we'll send a reset code."
        submitButton="Send reset code"
        submitting={loading}
        errorMessage={error}
        onSubmit={onRequestReset}
        fields={[
          {
            label: "Email or phone",
            name: "identifier",
            type: "text",
            required: true,
            placeholder: "you@example.com",
            value: identifier,
            onChange: (e) => setIdentifier(e.target.value),
          },
        ]}
        footer={<ModeSwitchFooter label="Back to log in" onClick={resetToLogin} />}
      />
    );
  } else if (mode === "reset") {
    form = (
      <AnimatedForm
        header="Enter your reset code"
        subHeader={`Check ${identifier || "your email/phone"} for the code, then set a new password.`}
        submitButton="Reset password"
        submitting={loading}
        errorMessage={error}
        onSubmit={onResetPassword}
        fields={[
          {
            label: "Email or phone",
            name: "identifier",
            type: "text",
            required: true,
            value: identifier,
            onChange: (e) => setIdentifier(e.target.value),
          },
          {
            label: "Reset code",
            name: "resetCode",
            type: "text",
            required: true,
            placeholder: "6-digit code",
            value: resetCode,
            onChange: (e) => setResetCode(e.target.value),
          },
          {
            label: "New password",
            name: "newPassword",
            type: "password",
            required: true,
            placeholder: "At least 8 characters",
            minLength: 8,
            value: newPassword,
            onChange: (e) => setNewPassword(e.target.value),
          },
        ]}
        footer={<ModeSwitchFooter label="Back to log in" onClick={resetToLogin} />}
      />
    );
  } else {
    const isSignup = mode === "signup";
    form = (
      <AnimatedForm
        header={isSignup ? "Create your account" : "Log in to Glido"}
        subHeader={isSignup ? "Just a few details to get started." : "Welcome back — enter your details to continue."}
        submitButton={isSignup ? "Create account" : "Log in"}
        submitting={loading}
        errorMessage={error}
        onSubmit={onSubmit}
        beforeFields={<GoogleDivider onToken={onGoogleToken} />}
        fields={[
          ...(isSignup
            ? [
                {
                  label: "Full name",
                  name: "name",
                  type: "text" as const,
                  required: true,
                  placeholder: "Your name",
                  value: name,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
                },
              ]
            : []),
          {
            label: "Email or phone",
            name: "identifier",
            type: "text",
            required: true,
            placeholder: "you@example.com",
            value: identifier,
            onChange: (e) => setIdentifier(e.target.value),
          },
          {
            label: "Password",
            name: "password",
            type: "password",
            required: true,
            placeholder: "••••••••",
            minLength: isSignup ? 8 : 6,
            value: password,
            onChange: (e) => setPassword(e.target.value),
          },
          ...(isSignup
            ? [
                {
                  label: "Referral code (optional)",
                  name: "referralCode",
                  type: "text" as const,
                  placeholder: "Friend's referral code",
                  value: referralCode,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setReferralCode(e.target.value),
                },
              ]
            : []),
        ]}
        footer={
          <div className="flex flex-col gap-3">
            {!isSignup && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                }}
                className="text-left text-xs font-medium text-[var(--glido-primary)]"
              >
                Forgot password?
              </button>
            )}
            <ModeSwitchFooter
              label={isSignup ? "Already have an account? Log in" : "New here? Create an account"}
              onClick={() => {
                setMode(isSignup ? "login" : "signup");
                setError(null);
              }}
            />
            <p className="text-center text-xs text-[var(--glido-muted)]">
              Demo customer account: <code>customer@glido.app</code> / <code>Customer@123</code>. Looking for the
              admin panel?{" "}
              <a href="/admin/login" className="underline">
                Sign in here
              </a>
              .
            </p>
          </div>
        }
      />
    );
  }

  return <AnimatedSignInShell orbitItems={orbitItems}>{form}</AnimatedSignInShell>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
