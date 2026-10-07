import Link from "next/link";

import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { ProductBadge } from "@/components/ui/Badge";
import { DeliveryLine } from "@/components/ui/DeliveryLine";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductImage } from "@/components/ui/ProductImage";
import { StarRating } from "@/components/ui/StarRating";
import type { ProductSummary } from "@/types/api";

import { ProductCard } from "./ProductCard";

function ProductRow({ product: p }: { product: ProductSummary }) {
  return (
    <article className="relative grid grid-cols-[7rem_1fr] gap-4 rounded-card bg-surface p-3 shadow-card sm:grid-cols-[12rem_1fr_12rem] sm:p-4">
      <Link href={`/product/${p.slug}`} tabIndex={-1} aria-hidden="true">
        <ProductImage src={p.image} alt="" sizes="(max-width: 640px) 30vw, 12rem" className="aspect-square w-full rounded-control" />
      </Link>
      <div className="min-w-0 space-y-1.5">
        {p.badges[0] && <ProductBadge label={p.badges[0]} />}
        <p className="text-xs font-medium text-ink-muted">{p.brand.name}</p>
        <h3 className="text-base font-semibold break-words">
          <Link href={`/product/${p.slug}`} className="hover:text-accent-text hover:underline">
            {p.title}
          </Link>
        </h3>
        <StarRating rating={p.rating_avg} count={p.rating_count} />
        <PriceTag cents={p.price_cents} listCents={p.list_price_cents} />
        <DeliveryLine speed={p.delivery_speed} />
        <p className="text-xs text-ink-muted">Sold by {p.seller.name}</p>
      </div>
      <div className="col-span-2 sm:col-span-1 sm:self-end">
        <AddToCartButton productId={p.id} title={p.title} disabled={p.stock <= 0} />
      </div>
    </article>
  );
}

export function ResultsGrid({ products, view }: { products: ProductSummary[]; view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id}>
            <ProductRow product={p} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 3} sizes="(max-width: 768px) 50vw, (max-width: 1280px) 30vw, 22vw" />
        </li>
      ))}
    </ul>
  );
}
