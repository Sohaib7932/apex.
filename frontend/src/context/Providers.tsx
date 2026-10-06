"use client";

import type { ReactNode } from "react";

import type { SessionUser } from "@/types/user";

import { AuthProvider } from "./AuthContext";
import { CartProvider } from "./CartContext";
import { ToastProvider } from "./ToastContext";

export function Providers({ user, children }: { user: SessionUser | null; children: ReactNode }) {
  return (
    <AuthProvider initialUser={user}>
      <ToastProvider>
        <CartProvider>{children}</CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
