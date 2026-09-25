"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { AnimatedSignInShell, AnimatedForm } from "@/components/ui/animated-sign-in";
import { Pizza, Soup, Sandwich, ShoppingBasket, Carrot, Apple } from "lucide-react";

const orbitItems = [
  { icon: Pizza, module: "food" as const },
  { icon: Soup, module: "food" as const },
  { icon: Sandwich, module: "food" as const },
  { icon: ShoppingBasket, module: "grocery" as const },
  { icon: Carrot, module: "grocery" as const },
  { icon: Apple, module: "grocery" as const },
];

function PartnerLoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/partner";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role !== "RESTAURANT_OWNER") {
        setError("This account is not a restaurant partner account.");
        return;
      }
      router.push(redirect);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatedSignInShell orbitItems={orbitItems}>
      <AnimatedForm
        header="Restaurant Partner Portal"
        subHeader="Sign in to manage your menu, orders and payouts."
        submitButton="Sign in"
        submitting={loading}
        errorMessage={error}
        onSubmit={onSubmit}
        fields={[
          {
            label: "Email",
            name: "email",
            type: "email",
            required: true,
            autoComplete: "username",
            value: identifier,
            onChange: (e) => setIdentifier(e.target.value),
          },
          {
            label: "Password",
            name: "password",
            type: "password",
            required: true,
            autoComplete: "current-password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
          },
        ]}
      />
    </AnimatedSignInShell>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={null}>
      <PartnerLoginForm />
    </Suspense>
  );
}
