import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { money } from "@/lib/format";
import type { HomePayload } from "@/types/api";

export function FeaturedBrand({ data }: { data: NonNullable<HomePayload["featured_brand"]> }) {
  return (
    <section aria-labelledby="brand-title" className="mx-auto max-w-375 px-4 py-6 md:px-6">
      <div className="grid gap-6 rounded-card bg-surface-tint-3 p-5 sm:p-8 lg:grid-cols-[1fr_1.6fr] lg:items-center">
        <div>
          <Badge tone="dark">Featured flagship brand</Badge>
          <h2 id="brand-title" className="mt-3 text-3xl font-extrabold tracking-tight">
            {data.brand.name} Pro Series
          </h2>
          <p className="mt-2 max-w-md text-base text-ink-muted">{data.tagline}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonLink href={`/search?brand=${data.brand.slug}`} variant="dark">
              Explore storefront
            </ButtonLink>
            <span className="text-sm text-ink-muted">
              Sold by <span className="font-semibold text-ink">{data.seller.name}</span>
            </span>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-3">
          {data.products.map((p) => (
            <li key={p.id}>
              <Link href={`/product/${p.slug}`} className="group block rounded-card bg-surface p-2 shadow-card sm:p-3">
                <ProductImage src={p.image} alt="" sizes="(max-width: 1024px) 30vw, 18vw" className="aspect-square w-full rounded-control" />
                <p title={p.title} className="mt-2 line-clamp-2 min-h-[2lh] text-xs font-semibold break-words group-hover:underline sm:text-sm">
                  {p.title}
                </p>
                <p className="mt-1 text-sm font-extrabold sm:text-base">{money(p.price_cents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
