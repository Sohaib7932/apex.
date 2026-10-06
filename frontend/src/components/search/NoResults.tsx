import { SearchX } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { clearFilters, hasFilters, type SearchState } from "@/lib/search-params";
import type { ProductSummary } from "@/types/api";

import { ProductCard } from "./ProductCard";

const SUGGESTIONS = ["wireless headphones", "mechanical keyboard", "4K monitor", "laptop", "coffee grinder", "smart speaker"];

export function NoResults({ state, popular }: { state: SearchState; popular: ProductSummary[] }) {
  return (
    <div className="space-y-10">
      <EmptyState
        icon={<SearchX aria-hidden="true" className="size-7" />}
        title={state.q ? `No results for "${state.q}"` : "No products match these filters"}
        action={hasFilters(state) ? <ButtonLink href={clearFilters(state)}>Clear all filters</ButtonLink> : undefined}
      >
        <ul className="list-inside list-disc space-y-1 text-left">
          <li>Check the spelling, or try fewer or more general words.</li>
          {hasFilters(state) && <li>Remove a filter or two to widen the results.</li>}
        </ul>
        <p className="mt-4 font-semibold text-ink">Popular searches</p>
        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <Link
                href={`/search?q=${encodeURIComponent(s)}`}
                className="inline-flex min-h-10 items-center rounded-pill border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-tint"
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </EmptyState>
      {popular.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold">Popular right now</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {popular.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
