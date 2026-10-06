"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Mode = "buying" | "selling";

type Props = {
  /** Whether the signed-in user already owns a store. */
  hasStore: boolean;
  /** Force a mode (style guide); normally derived from the URL. */
  mode?: Mode;
  className?: string;
};

/**
 * Buying/Selling switch (PRD 4.1). Rendered for signed-in users only.
 * Selling goes to the seller workspace, or to onboarding if there is no store yet.
 */
export function ModeSwitch({ hasStore, mode, className = "" }: Props) {
  const pathname = usePathname();
  const active: Mode = mode ?? (pathname.startsWith("/seller") ? "selling" : "buying");
  const sellingHref = hasStore ? "/seller" : "/seller/start";

  const base =
    "rounded-pill px-3 py-1.5 text-2xs font-bold uppercase tracking-wide transition-colors";
  const idle = "text-ink-muted hover:text-ink";

  return (
    <nav
      aria-label="Shopping mode"
      className={`inline-flex items-center gap-0.5 rounded-pill bg-switch-track p-1 ${className}`}
    >
      <Link
        href="/"
        aria-current={active === "buying" ? "page" : undefined}
        className={`${base} ${active === "buying" ? "bg-primary text-on-primary shadow-card" : idle}`}
      >
        Buying
      </Link>
      <Link
        href={sellingHref}
        aria-current={active === "selling" ? "page" : undefined}
        className={`${base} ${active === "selling" ? "bg-seller text-on-seller shadow-card" : idle}`}
      >
        Selling
      </Link>
    </nav>
  );
}
