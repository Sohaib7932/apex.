"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useAuth } from "@/context/AuthContext";
import { ProductImage } from "@/components/ui/ProductImage";
import { money } from "@/lib/format";
import { readRecent, type RecentItem } from "@/lib/recent";
import type { ProductSummary } from "@/types/api";

const noop = () => () => {};
const EMPTY: RecentItem[] = [];
let cache: { raw: string | null; items: RecentItem[] } = { raw: null, items: [] };

function snapshot(): RecentItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("apex_recent_v1");
  } catch {
    /* storage blocked */
  }
  if (raw !== cache.raw) cache = { raw, items: readRecent() };
  return cache.items;
}

/** "Keep shopping for": recently viewed products in this browser, or popular picks. */
export function KeepShopping({ fallback }: { fallback: ProductSummary[] }) {
  const { user } = useAuth();
  const recent = useSyncExternalStore(noop, snapshot, () => EMPTY);
  const hasRecent = recent.length > 0;
  const items = hasRecent
    ? recent.slice(0, 4).map((r) => ({ slug: r.slug, title: r.title, image: r.image, price: r.price_cents }))
    : fallback.map((p) => ({ slug: p.slug, title: p.title, image: p.image, price: p.price_cents }));

  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-4 shadow-card sm:p-5">
      <h3 className="text-lg font-extrabold tracking-tight">
        {hasRecent ? `Keep shopping${user ? ` for ${user.name.split(" ")[0]}` : ""}` : "Popular right now"}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        {hasRecent ? "Items you viewed recently" : "Top-rated picks other shoppers love"}
      </p>
      <ul className="mt-4 flex-1 space-y-3">
        {items.map((it) => (
          <li key={it.slug}>
            <Link href={`/product/${it.slug}`} className="group flex items-center gap-3">
              <ProductImage src={it.image} alt="" sizes="64px" className="size-16 shrink-0 rounded-control" />
              <span className="min-w-0">
                <span title={it.title} className="line-clamp-2 text-sm font-semibold break-words group-hover:underline">
                  {it.title}
                </span>
                <span className="text-sm font-bold">{money(it.price)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/search?sort=rating"
        className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-accent-text hover:underline"
      >
        See more top-rated items
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
