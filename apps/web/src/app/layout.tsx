import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { GroceryCartProvider } from "@/lib/grocery-cart-context";
import { ToastProvider } from "@/lib/toast-context";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--glido-bg)]">
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <GroceryCartProvider>{children}</GroceryCartProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
