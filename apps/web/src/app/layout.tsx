import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { GroceryCartProvider } from "@/lib/grocery-cart-context";
import { ToastProvider } from "@/lib/toast-context";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Glido — Food, Grocery & Cab",
  description: "Glido — order food, get groceries delivered, and book rides. One app, everything local.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce here (set by middleware.ts) is what makes Next.js apply it to
  // its own internally-injected hydration/streaming <script> tags automatically —
  // without this read, those scripts render without a nonce and the strict
  // script-src in middleware.ts blocks them, breaking hydration site-wide.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <head>
        {/* Same-origin file, not inline — a nonce isn't required for external-src scripts. */}
        <script src="/theme-init.js" nonce={nonce} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--glido-bg)] text-[var(--glido-ink)]">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <GroceryCartProvider>{children}</GroceryCartProvider>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
