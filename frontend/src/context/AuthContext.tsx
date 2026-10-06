"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api-client";
import type { SessionUser } from "@/types/user";

type AuthValue = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ initialUser, children }: { initialUser: SessionUser | null; children: ReactNode }) {
  const [user, setUser] = useState(initialUser);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await api<SessionUser>("/auth/me"));
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, setUser, refreshUser, logout }), [user, refreshUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
