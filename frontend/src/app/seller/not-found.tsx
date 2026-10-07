import { SearchX } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";

export default function SellerNotFound() {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center shadow-card">
      <span className="grid size-16 place-items-center rounded-pill bg-primary-soft text-accent-text">
        <SearchX aria-hidden="true" className="size-8" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-wide text-accent-text">Not found</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">That isn&apos;t in your store</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">It may have been deleted, or it belongs to another store.</p>
      <ButtonLink href="/seller/products" className="mt-6">
        Back to your products
      </ButtonLink>
    </div>
  );
}
