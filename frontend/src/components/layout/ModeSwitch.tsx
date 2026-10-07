"use client";

import { ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Mode = "buying" | "selling";

type Props = {
  /** guest: signed out; buyer: signed in without a store; seller: owns a store. */
  account: "guest" | "buyer" | "seller";
  className?: string;
};

/** Where "Selling" leads for each kind of visitor. */
export const SELLING_HREF = {
  // Sign in first, then /seller sends people without a store on to /seller/start.
  guest: "/login?next=%2Fseller",
  buyer: "/seller/start",
  seller: "/seller",
} as const;

/**
 * Buying/Selling switch (PRD 4.1), shown to everyone; Buying is the default.
 * The active side follows the URL: any /seller page is Selling, everything else Buying.
 *
 * On the black header: a dark pill track; the active side is a deep orange fill with
 * white text (4.8:1), the inactive side light gray text (8:1 on the track).
 */
export function ModeSwitch({ account, className = "" }: Props) {
  const pathname = usePathname();
  const active: Mode = pathname === "/seller" || pathname.startsWith("/seller/") ? "selling" : "buying";
  const sellingHref = SELLING_HREF[account];

  const segment = (mode: Mode) =>
    `inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 text-xs font-bold uppercase tracking-wide transition-colors lg:min-h-9 lg:px-3.5 ${
      active === mode
        ? "bg-primary-strong text-white shadow-card"
        : "text-on-chrome-muted hover:bg-chrome-2 hover:text-on-chrome"
    }`;

  return (
    <nav
      aria-label="Shopping mode"
      className={`items-center gap-0.5 rounded-pill border border-chrome-line bg-chrome-line p-1 ${className || "inline-flex"}`}
    >
      <Link href="/" aria-current={active === "buying" ? "page" : undefined} className={segment("buying")}>
        <ShoppingBag aria-hidden="true" className="size-4" />
        Buying
      </Link>
      <Link href={sellingHref} aria-current={active === "selling" ? "page" : undefined} className={segment("selling")}>
        <Store aria-hidden="true" className="size-4" />
        Selling
      </Link>
    </nav>
  );
}
