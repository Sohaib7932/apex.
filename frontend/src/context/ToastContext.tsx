"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error"; message: string; action?: { label: string; href: string } };
type ToastValue = { notify: (t: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card bg-chrome px-4 py-3 text-sm text-on-chrome shadow-pop"
          >
            {t.kind === "success" ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            ) : (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-deal-soft" />
            )}
            <p className="flex-1">{t.message}</p>
            {t.action && (
              <Link href={t.action.href} className="shrink-0 font-bold text-primary hover:underline">
                {t.action.label}
              </Link>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="shrink-0 rounded p-0.5">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
