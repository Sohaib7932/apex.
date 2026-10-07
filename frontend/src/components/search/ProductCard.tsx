import Link from "next/link";

import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { ProductBadge } from "@/components/ui/Badge";
import { DeliveryLine } from "@/components/ui/DeliveryLine";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductImage } from "@/components/ui/ProductImage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarRating } from "@/components/ui/StarRating";
import { discountPct } from "@/lib/format";
import type { ProductSummary } from "@/types/api";

/**
 * Product card used in search, carousels and recommendations. The card is a flex
 * column with the button pinned to the bottom, so Add to Cart lines up across a row.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
}: {
  product: ProductSummary;
  priority?: boolean;
  sizes?: string;
}) {
  const p = product;
  const pct = discountPct(p.price_cents, p.list_price_cents);
  const badge = p.badges[0];
  const outOfStock = p.stock <= 0;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-pop">
      <Link href={`/product/${p.slug}`} className="relative block" tabIndex={-1} aria-hidden="true">
        <ProductImage src={p.image} alt="" sizes={sizes} priority={priority} className="aspect-[4/3] w-full" />
        <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {badge && <ProductBadge label={badge} />}
          {pct >= 10 && (
            <span className="rounded-control bg-primary px-2 py-0.5 text-2xs font-bold text-on-primary">
              {pct}% OFF
            </span>
          )}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-xs font-medium text-ink-muted">{p.brand.name}</p>
        <h3 title={p.title} className="line-clamp-2 min-h-[2lh] text-sm leading-snug font-semibold break-words sm:text-base">
          <Link href={`/product/${p.slug}`} className="hover:text-accent-text hover:underline">
            {p.title}
          </Link>
        </h3>
        <StarRating rating={p.rating_avg} count={p.rating_count} />
        <div className="mt-1">
          <PriceTag cents={p.price_cents} listCents={p.list_price_cents} size="md" />
        </div>
        {p.deal && (
          <div className="space-y-1">
            <ProgressBar value={p.deal.claimed_pct} label={`${p.deal.claimed_pct}% claimed`} />
            <p className="text-xs font-semibold text-accent-text">{p.deal.claimed_pct}% claimed</p>
          </div>
        )}
        <DeliveryLine speed={p.delivery_speed} />
        {p.stock > 0 && p.stock <= 5 && (
          <p className="text-xs font-semibold text-deal">Only {p.stock} left in stock</p>
        )}
        <div className="mt-auto pt-2">
          <AddToCartButton productId={p.id} title={p.title} disabled={outOfStock} />
        </div>
      </div>
    </article>
  );
}
