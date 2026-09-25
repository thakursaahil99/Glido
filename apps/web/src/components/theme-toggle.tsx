"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`h-9 w-9 rounded-full border border-[var(--glido-border)] bg-[var(--glido-surface)] flex items-center justify-center text-[var(--glido-muted)] hover:text-[var(--glido-primary)] hover:border-[var(--glido-primary)] transition-colors shrink-0 ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
