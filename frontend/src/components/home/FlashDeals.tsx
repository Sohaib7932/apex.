import Link from "next/link";

import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { Countdown } from "@/components/ui/Countdown";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductImage } from "@/components/ui/ProductImage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { ProductSummary } from "@/types/api";

function urgency(pct: number): string {
  if (pct >= 85) return "Almost gone";
  if (pct >= 60) return "Ending soon";
  return "Selling fast";
}

export function FlashDeals({ products, total }: { products: ProductSummary[]; total: number }) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-375 px-4 py-10 md:px-6">
      <SectionHeading
        tag="Limited windows"
        title="Flash Deals & Lightning Discounts"
        subtitle="Deep discounts that refresh every 12 hours, while stock lasts."
        link={{ href: "/search?deals=today", label: `See all ${total} active flash deals` }}
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card">
              <Link href={`/product/${p.slug}`} className="relative block" tabIndex={-1} aria-hidden="true">
                <ProductImage src={p.image} alt="" sizes="(max-width: 1024px) 50vw, 25vw" className="aspect-square w-full" />
                {p.deal && (
                  <span className="absolute top-2 left-2 rounded-control bg-deal px-2 py-0.5 text-xs font-bold text-white">
                    -{p.deal.discount_pct}% DEAL
                  </span>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                <h3 title={p.title} className="line-clamp-2 min-h-[2lh] text-sm font-semibold break-words sm:text-base">
                  <Link href={`/product/${p.slug}`} className="hover:underline">
                    {p.title}
                  </Link>
                </h3>
                <PriceTag cents={p.price_cents} listCents={p.list_price_cents} size="md" />
                {p.deal && (
                  <div className="space-y-1">
                    <ProgressBar value={p.deal.claimed_pct} label={`${p.deal.claimed_pct}% claimed`} />
                    <p className="flex flex-wrap justify-between gap-x-2 text-xs font-semibold">
                      <span className="text-ink-muted">{p.deal.claimed_pct}% claimed</span>
                      <span className="text-deal">{urgency(p.deal.claimed_pct)}</span>
                    </p>
                    <p className="text-xs text-ink-muted">
                      Ends in <Countdown to={p.deal.ends_at} format="words" className="font-bold text-ink" />
                    </p>
                  </div>
                )}
                <div className="mt-auto pt-1">
                  <AddToCartButton productId={p.id} title={p.title} disabled={p.stock <= 0} label="Claim deal" />
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
