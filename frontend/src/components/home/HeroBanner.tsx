import { BadgeCheck, Headphones, Truck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductSummary } from "@/types/api";

export function HeroBanner({ spotlight }: { spotlight: ProductSummary | null }) {
  return (
    <section aria-labelledby="hero-title" className="bg-surface-tint">
      <div className="mx-auto grid max-w-375 items-center gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-14">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="orange">Exclusive summer event</Badge>
            <Badge tone="dark">Flagship picks</Badge>
          </div>
          <h1 id="hero-title" className="mt-4 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
            Summer Technology Showcase &amp; Smart Living.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">
            Save up to 45% on flagship noise-cancelling headphones, ultra-light laptops and ergonomic home office
            gear, sold by independent stores and shipped fast.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/search?deals=today" size="lg">
              Explore featured deals
            </ButtonLink>
            <ButtonLink href="/search?badge=apex-choice" variant="outline" size="lg">
              Shop Apex Choice
            </ButtonLink>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <Truck aria-hidden="true" className="size-4 text-accent-text" /> Same-day dispatch
            </li>
            <li className="flex items-center gap-2">
              <BadgeCheck aria-hidden="true" className="size-4 text-accent-text" /> Official brand warranty
            </li>
          </ul>
        </div>

        {spotlight && (
          <Link
            href={`/product/${spotlight.slug}`}
            className="group relative block overflow-hidden rounded-card bg-chrome shadow-pop"
          >
            <ProductImage
              src={spotlight.image}
              alt={spotlight.title}
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-card bg-surface/95 p-3 shadow-card backdrop-blur sm:inset-x-4 sm:bottom-4 sm:p-4">
              <span className="hidden size-11 shrink-0 place-items-center rounded-pill bg-primary-soft text-accent-text sm:grid">
                <Headphones aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-bold uppercase tracking-wide text-accent-text">Spotlight item</p>
                <p title={spotlight.title} className="line-clamp-2 text-sm font-bold break-words sm:text-base">
                  {spotlight.title}
                </p>
              </div>
              <PriceTag cents={spotlight.price_cents} listCents={spotlight.list_price_cents} size="md" />
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
