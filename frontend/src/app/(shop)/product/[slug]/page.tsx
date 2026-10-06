import { CircleCheck, ChevronRight, ExternalLink, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCarousel } from "@/components/home/ProductCarousel";
import { BuyBox } from "@/components/product/BuyBox";
import { FrequentlyBoughtTogether } from "@/components/product/FrequentlyBoughtTogether";
import { ImageGallery } from "@/components/product/ImageGallery";
import { PurchaseProvider } from "@/components/product/PurchaseContext";
import { RecordView } from "@/components/product/RecordView";
import { Reviews } from "@/components/product/Reviews";
import { PriceBox, VariantPicker } from "@/components/product/VariantPicker";
import { ErrorState } from "@/components/ui/States";
import { StarRating } from "@/components/ui/StarRating";
import { apiGet } from "@/lib/api-server";
import { getProduct } from "@/lib/products";
import { boughtLabel, compactCount } from "@/lib/format";
import type { ProductSummary, Related, ReviewPage } from "@/types/api";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const res = await getProduct(slug);
  return res.ok
    ? { title: res.data.title, description: res.data.description }
    : { title: "Product not found" };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const [detail, related, reviews] = await Promise.all([
    getProduct(slug),
    apiGet<Related>(`/products/${slug}/related`),
    apiGet<ReviewPage>(`/products/${slug}/reviews`, { auth: true }),
  ]);

  if (!detail.ok) {
    if (detail.status === 404) notFound();
    return (
      <div className="mx-auto max-w-375 px-4 py-10 md:px-6">
        <ErrorState title="We couldn't load this product" message={detail.message} />
      </div>
    );
  }
  const p = detail.data;
  const bought = boughtLabel(p.bought_past_month);
  const specs = Object.entries(p.specs);
  const asSummary: ProductSummary = p;

  return (
    <div className="mx-auto max-w-375 space-y-8 px-4 py-5 md:px-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <li>
            <Link href="/" className="hover:text-ink hover:underline">
              Home
            </Link>
          </li>
          {p.breadcrumbs.map((c) => (
            <li key={c.slug} className="flex items-center gap-1">
              <ChevronRight aria-hidden="true" className="size-4" />
              <Link href={`/search?category=${c.slug}`} className="hover:text-ink hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <PurchaseProvider product={p}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_20rem] lg:gap-8">
          <div className="lg:row-span-2">
            <ImageGallery images={p.images} title={p.title} badge={p.badges[0]} />
            {specs.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-2">
                {specs.slice(0, 3).map(([k, v]) => (
                  <li key={k} className="rounded-control bg-surface p-3 shadow-card">
                    <p className="line-clamp-1 text-sm font-bold">{v}</p>
                    <p className="text-xs text-ink-muted">{k}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <Link
              href={`/search?seller=${p.seller.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-accent-text hover:underline"
            >
              Visit the {p.seller.name} Store
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </Link>
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">{p.title}</h1>
            <p className="text-base text-ink-muted">{p.description}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href="#reviews" className="hover:underline">
                <StarRating rating={p.rating_avg} />
                <span className="ml-1.5 text-sm text-accent-text">{compactCount(p.rating_count)} ratings</span>
              </a>
              {bought && (
                <span className="inline-flex items-center gap-1 rounded-control bg-surface-tint-2 px-2 py-1 text-xs font-semibold">
                  <TrendingUp aria-hidden="true" className="size-3.5" /> {bought}
                </span>
              )}
            </div>
            <PriceBox />
            <VariantPicker />
          </div>

          <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <BuyBox />
          </div>

          <div className="space-y-6 lg:col-start-2">
            {p.highlights.length > 0 && (
              <section aria-labelledby="innovations">
                <h2 id="innovations" className="text-base font-bold uppercase tracking-wide">
                  Key innovations
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex gap-2.5 text-sm">
                      <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-text" />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {specs.length > 0 && (
              <section aria-labelledby="specs" className="rounded-card bg-surface p-4 shadow-card">
                <h2 id="specs" className="text-base font-bold">
                  Technical specifications
                </h2>
                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {specs.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{k}</dt>
                      <dd className="text-sm">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <section className="rounded-card bg-surface p-4 text-sm shadow-card">
              <h2 className="text-base font-bold">About the seller</h2>
              <p className="mt-1 text-ink-muted">
                <span className="font-semibold text-ink">{p.seller_detail.name}</span>: {p.seller_detail.description}
              </p>
            </section>
          </div>
        </div>
      </PurchaseProvider>

      {related.ok && related.data.bundle.length > 0 && (
        <FrequentlyBoughtTogether items={[asSummary, ...related.data.bundle]} />
      )}

      {reviews.ok ? (
        <Reviews slug={p.slug} initial={reviews.data} />
      ) : (
        <ErrorState title="Reviews didn't load" message={reviews.message} />
      )}

      {related.ok && related.data.also_bought.length > 0 && (
        <div className="-mx-4 md:-mx-6">
          <ProductCarousel title="Customers also viewed" products={related.data.also_bought} />
        </div>
      )}

      <RecordView slug={p.slug} title={p.title} image={p.image} price={p.price_cents} />
    </div>
  );
}
