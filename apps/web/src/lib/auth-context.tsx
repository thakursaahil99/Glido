"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getTokens, setTokens } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  register: (name: string, identifier: string, password: string, referralCode?: string) => Promise<User>;
  login: (identifier: string, password: string) => Promise<User>;
  googleLogin: (idToken: string, referralCode?: string) => Promise<User>;
  passwordLogin: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<User>("/users/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (name: string, identifier: string, password: string, referralCode?: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/register",
      { name, identifier, password, referralCode: referralCode || undefined },
    );
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/login",
      { identifier, password },
    );
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const googleLogin = useCallback(async (idToken: string, referralCode?: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/google",
      { idToken, referralCode: referralCode || undefined },
    );
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  // Admin panel login — same shape, dedicated endpoint that also checks role === ADMIN.
  const passwordLogin = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/admin/login",
      { email, password },
    );
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getTokens();
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } catch {
      // ignore — we clear local state regardless
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, register, login, googleLogin, passwordLogin, logout, refreshUser }),
    [user, loading, register, login, googleLogin, passwordLogin, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
