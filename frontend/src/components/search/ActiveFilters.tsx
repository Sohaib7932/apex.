import { X } from "lucide-react";
import Link from "next/link";

import { clearFilters, hasFilters, withChanges, type SearchState } from "@/lib/search-params";
import type { SearchFilters } from "@/types/api";

/** Removable chips for every active sidebar filter, plus "Clear all filters". */
export function ActiveFilters({ state, filters }: { state: SearchState; filters: SearchFilters }) {
  if (!hasFilters(state)) return null;
  const brandName = (slug: string) => filters.brands.find((b) => b.value === slug)?.label ?? slug;
  const chips: { label: string; href: string }[] = [];

  if (state.delivery === "one_day") chips.push({ label: "Apex One-Day", href: withChanges(state, { delivery: "" }) });
  if (state.in_stock) chips.push({ label: "In stock", href: withChanges(state, { in_stock: "" }) });
  if (state.min_rating) chips.push({ label: `${state.min_rating}★ & up`, href: withChanges(state, { min_rating: "" }) });
  state.brand.forEach((b) =>
    chips.push({ label: brandName(b), href: withChanges(state, { brand: state.brand.filter((x) => x !== b) }) }),
  );
  if (state.min_price || state.max_price) {
    const label = state.min_price && state.max_price
      ? `$${state.min_price} to $${state.max_price}`
      : state.min_price
        ? `$${state.min_price} & above`
        : `Under $${state.max_price}`;
    chips.push({ label, href: withChanges(state, { min_price: "", max_price: "" }) });
  }
  state.facet.forEach((f) =>
    chips.push({ label: f.split(":")[1] ?? f, href: withChanges(state, { facet: state.facet.filter((x) => x !== f) }) }),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Active filters:</span>
      {chips.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          scroll={false}
          aria-label={`Remove filter: ${c.label}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-pill sm:min-h-9 border border-line bg-surface px-3 text-sm font-semibold hover:border-ink"
        >
          {c.label}
          <X aria-hidden="true" className="size-3.5" />
        </Link>
      ))}
      <Link href={clearFilters(state)} scroll={false} className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-accent-text hover:underline sm:min-h-9">
        Clear all filters
      </Link>
    </div>
  );
}
