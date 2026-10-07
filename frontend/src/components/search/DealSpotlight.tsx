import { Tag } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import type { ProductSummary } from "@/types/api";

/** Dark promo strip above results, built from the first deal in the result set. */
export function DealSpotlight({ product }: { product: ProductSummary }) {
  if (!product.deal) return null;
  return (
    <section className="flex flex-col gap-4 rounded-card bg-chrome p-4 text-on-chrome sm:flex-row sm:items-center sm:p-5">
      <span className="hidden size-12 shrink-0 place-items-center rounded-control bg-primary text-on-primary sm:grid">
        <Tag aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-control bg-primary px-2 py-0.5 font-bold uppercase tracking-wide text-on-primary">
            Apex deal spotlight
          </span>
          <span className="text-on-chrome-muted">
            Ends in <Countdown to={product.deal.ends_at} format="words" className="font-bold text-on-chrome" />
          </span>
        </p>
        <p className="mt-1.5 text-base font-bold break-words">
          {product.deal.discount_pct}% off {product.title}
        </p>
        <p className="text-sm text-on-chrome-muted">{product.deal.claimed_pct}% claimed. Limited stock at this price.</p>
      </div>
      <ButtonLink href={`/product/${product.slug}`} className="shrink-0">
        Shop the deal
      </ButtonLink>
    </section>
  );
}
