"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { AnimatedSignInShell, AnimatedForm } from "@/components/ui/animated-sign-in";
import { Pizza, Soup, Sandwich, ShoppingBasket, Carrot, Apple, Car, CarTaxiFront } from "lucide-react";

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

function AdminLoginForm() {
  const { passwordLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <AnimatedSignInShell orbitItems={orbitItems}>
      <AnimatedForm
        header="Admin sign in"
        subHeader="Sign in to manage food, grocery and cab operations."
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
            value: email,
            onChange: (e) => setEmail(e.target.value),
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
