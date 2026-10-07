import { Store } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

import { SellerSidebar, SellerTabBar } from "./SellerNav";

/**
 * Seller Central: the same Apex palette as the storefront (white cards, orange actions,
 * black chrome), arranged as a work area. Sidebar on desktop, bottom tabs on phones,
 * no deal banners or department bar.
 */
export function SellerShell({
  store,
  children,
}: {
  store: { store_name: string; slug: string } | null;
  children: ReactNode;
}) {
  return (
    <>
      <main id="main" className="flex-1 bg-canvas">
        {store && (
          <div className="border-b border-line bg-surface lg:hidden">
            <div className="mx-auto flex max-w-375 items-center gap-2 px-4 py-2.5 text-sm">
              <Store aria-hidden="true" className="size-4 text-accent-text" />
              <span className="text-2xs font-bold uppercase tracking-wide text-accent-text">Seller Central</span>
              <span className="min-w-0 font-bold break-words">{store.store_name}</span>
            </div>
          </div>
        )}
        <div className={`mx-auto grid max-w-375 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[15rem_1fr] lg:py-8 lg:pb-10 ${store ? "pb-24" : "pb-10"}`}>
          {store && (
            <aside className="hidden lg:block">
              <SellerSidebar storeName={store.store_name} storeSlug={store.slug} />
            </aside>
          )}
          <div className={`min-w-0 ${store ? "" : "lg:col-span-2"}`}>{children}</div>
        </div>
      </main>
      {store && <SellerTabBar />}
      <footer className="bg-chrome-2 text-on-chrome">
        <div className={`mx-auto flex max-w-375 flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6 lg:pb-5 ${store ? "pb-24" : ""}`}>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs font-bold uppercase tracking-wide text-on-chrome-muted">Seller Central</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 text-xs">
            <Link href="/info/fulfillment" className="inline-flex min-h-11 items-center font-semibold hover:underline md:min-h-0">
              Seller help
            </Link>
            <Link href="/info/conditions" className="inline-flex min-h-11 items-center font-semibold hover:underline md:min-h-0">
              Conditions of Use
            </Link>
            <span className="text-on-chrome-muted">Demo project, not a real store.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export function SellerPageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight break-words sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted break-words">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
