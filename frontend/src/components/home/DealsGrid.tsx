import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { Countdown } from "@/components/ui/Countdown";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductImage } from "@/components/ui/ProductImage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarRating } from "@/components/ui/StarRating";
import { money } from "@/lib/format";
import type { HomePayload, ProductSummary } from "@/types/api";

import { KeepShopping } from "./KeepShopping";

function Card({ title, subtitle, footer, children }: { title: ReactNode; subtitle?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-4 shadow-card sm:p-5">
      <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      <div className="mt-4 flex-1">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-accent-text hover:underline">
      {children}
      <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

function Tiles({ products, note }: { products: ProductSummary[]; note: (p: ProductSummary) => string }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {products.map((p) => (
        <li key={p.id}>
          <Link href={`/product/${p.slug}`} className="group block">
            <ProductImage src={p.image} alt="" sizes="(max-width: 768px) 45vw, 12vw" className="aspect-square w-full rounded-control" />
            <p className="mt-1.5 line-clamp-1 text-sm font-semibold group-hover:underline">{p.title}</p>
            <p className="text-xs text-ink-muted">{note(p)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DealOfTheDay({ product }: { product: ProductSummary }) {
  const deal = product.deal;
  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-4 shadow-card ring-2 ring-primary sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-control bg-primary px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-on-primary">
          Deal of the day
        </span>
        {deal && (
          <span className="flex items-center gap-1 text-sm font-bold text-deal">
            <Clock aria-hidden="true" className="size-4" />
            <Countdown to={deal.ends_at} />
          </span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-extrabold tracking-tight">Apex Choice Deals</h3>
      <Link href={`/product/${product.slug}`} className="group mt-3 block">
        <ProductImage src={product.image} alt="" sizes="(max-width: 768px) 90vw, 22vw" className="aspect-[4/3] w-full rounded-control" />
        <p className="mt-3 line-clamp-2 text-sm font-semibold group-hover:underline">{product.title}</p>
      </Link>
      <div className="mt-1">
        <StarRating rating={product.rating_avg} count={product.rating_count} />
      </div>
      <div className="mt-2">
        <PriceTag cents={product.price_cents} listCents={product.list_price_cents} size="lg" showDiscount />
      </div>
      {deal && (
        <div className="mt-3 space-y-1">
          <ProgressBar value={deal.claimed_pct} label={`${deal.claimed_pct}% claimed`} />
          <p className="flex justify-between text-xs font-semibold text-ink-muted">
            <span>Claimed: {deal.claimed_pct}%</span>
            <span className="text-accent-text">Lightning Rush</span>
          </p>
        </div>
      )}
      <div className="mt-auto pt-4">
        <AddToCartButton productId={product.id} title={product.title} disabled={product.stock <= 0} />
      </div>
    </section>
  );
}

export function DealsGrid({ deals }: { deals: HomePayload["deals"] }) {
  return (
    <section aria-label="Deals" className="mx-auto max-w-375 px-4 md:px-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Refresh your workspace"
          subtitle="Ergonomic upgrades built for long workdays"
          footer={<FooterLink href="/search?category=accessories">Explore workspace essentials</FooterLink>}
        >
          <Tiles products={deals.workspace} note={(p) => `From ${money(p.price_cents)}`} />
        </Card>
        {deals.deal_of_the_day && <DealOfTheDay product={deals.deal_of_the_day} />}
        <KeepShopping fallback={deals.keep_shopping} />
        <Card
          title="Smart Home & Audio"
          subtitle="Connect your home seamlessly"
          footer={<FooterLink href="/search?category=smart-home">Discover connected living</FooterLink>}
        >
          <Tiles products={deals.smart_home} note={(p) => `Under ${money(Math.ceil(p.price_cents / 1000) * 1000)}`} />
        </Card>
      </div>
    </section>
  );
}
