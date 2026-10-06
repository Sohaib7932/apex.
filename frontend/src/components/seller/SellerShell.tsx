import Link from "next/link";
import type { ReactNode } from "react";

import { SellerSidebar, SellerTabBar } from "./SellerNav";

/** Calmer workspace chrome: green accents, sidebar on desktop, bottom tabs on mobile, no deal banners. */
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
        <div className="mx-auto grid max-w-375 gap-6 px-4 py-6 pb-24 md:px-6 lg:grid-cols-[15rem_1fr] lg:pb-10">
          {store && (
            <aside className="hidden lg:block">
              <SellerSidebar storeName={store.store_name} storeSlug={store.slug} />
            </aside>
          )}
          <div className={`min-w-0 ${store ? "" : "lg:col-span-2"}`}>{children}</div>
        </div>
      </main>
      {store && <SellerTabBar />}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-375 flex-wrap items-center justify-between gap-2 px-4 py-4 pb-20 text-xs text-ink-muted md:px-6 lg:pb-4">
          <p>Apex Seller Workspace. Demo project, not a real store.</p>
          <p className="flex gap-4">
            <Link href="/info/fulfillment" className="hover:underline">
              Seller help
            </Link>
            <Link href="/info/conditions" className="hover:underline">
              Conditions of Use
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}

export function SellerPageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
