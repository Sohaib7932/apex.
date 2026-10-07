"use client";

import { ArrowLeft, ExternalLink, LayoutDashboard, Package, Settings, Truck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; short: string; icon: LucideIcon }[] = [
  { href: "/seller", label: "Overview", short: "Overview", icon: LayoutDashboard },
  { href: "/seller/products", label: "Products", short: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", short: "Orders", icon: Truck },
  { href: "/seller/settings", label: "Store settings", short: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/seller" ? pathname === "/seller" : pathname.startsWith(href);
}

/** Desktop sidebar: white card, "Seller Central" label, orange marker on the current page. */
export function SellerSidebar({ storeName, storeSlug }: { storeName: string; storeSlug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seller workspace" className="sticky top-4 rounded-card bg-surface p-3 shadow-card">
      <div className="border-b border-line px-3 pt-2 pb-4">
        <p className="text-2xs font-bold uppercase tracking-wide text-accent-text">Seller Central</p>
        <p className="mt-1 line-clamp-2 text-base font-extrabold">{storeName}</p>
      </div>
      <ul className="mt-3 space-y-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm transition-colors ${
                  active
                    ? "bg-primary-soft font-bold text-ink before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-pill before:bg-primary"
                    : "font-semibold text-ink-muted hover:bg-surface-tint hover:text-ink"
                }`}
              >
                <Icon aria-hidden="true" className={`size-5 ${active ? "text-accent-text" : ""}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 space-y-1 border-t border-line pt-3">
        <Link
          href={`/search?seller=${storeSlug}`}
          className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm text-ink-muted hover:bg-surface-tint hover:text-ink"
        >
          <ExternalLink aria-hidden="true" className="size-4" /> View storefront
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm text-ink-muted hover:bg-surface-tint hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to shopping
        </Link>
      </div>
    </nav>
  );
}

/** Mobile bottom tab bar (PRD 4.10). */
export function SellerTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Seller workspace"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {ITEMS.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                  active
                    ? "text-ink after:absolute after:inset-x-6 after:top-0 after:h-1 after:rounded-b-pill after:bg-primary"
                    : "text-ink-muted"
                }`}
              >
                <Icon aria-hidden="true" className={`size-5 ${active ? "text-accent-text" : ""}`} />
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
