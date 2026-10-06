"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center shadow-card">
      {icon && (
        <div className="mb-4 grid size-14 place-items-center rounded-pill bg-primary-soft text-accent-text">{icon}</div>
      )}
      <h2 className="text-xl font-extrabold">{title}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Failed request: explain and offer a retry that re-runs the server render. */
export function ErrorState({
  title = "We couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retry = onRetry ?? (() => startTransition(() => router.refresh()));
  return (
    <div role="alert" className="flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center shadow-card">
      <div className="mb-4 grid size-14 place-items-center rounded-pill bg-deal-soft text-deal">
        <CircleAlert aria-hidden="true" className="size-7" />
      </div>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        {message ?? "Something went wrong while loading this page."} If the store was asleep, it can take a few
        seconds to wake up.
      </p>
      <Button className="mt-6" onClick={retry} loading={pending}>
        <RotateCw aria-hidden="true" className="size-4" />
        Try again
      </Button>
    </div>
  );
}
