import type { Metadata } from "next";

import { ActiveFilters } from "@/components/search/ActiveFilters";
import { DealSpotlight } from "@/components/search/DealSpotlight";
import { FilterSidebar } from "@/components/search/FilterSidebar";
import { NoResults } from "@/components/search/NoResults";
import { Pagination } from "@/components/search/Pagination";
import { ResultsGrid } from "@/components/search/ResultsGrid";
import { ResultsArea, SearchNavProvider } from "@/components/search/SearchNav";
import { SortBar } from "@/components/search/SortBar";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { apiQuery, parseSearch, withChanges, type SearchState } from "@/lib/search-params";
import type { Category, ProductPage, SearchFilters } from "@/types/api";

const BADGE_LABELS: Record<string, string> = {
  "best-seller": "Best Sellers",
  "apex-choice": "Apex Choice",
  "limited-deal": "Limited Deals",
  "new-arrival": "New Arrivals",
  "top-rated": "Top Rated",
};

function headline(state: SearchState, categories: Category[], storeName?: string): string {
  if (state.q) return state.q;
  const parts: string[] = [];
  if (state.deals) parts.push("Today's Deals");
  if (state.badge) parts.push(BADGE_LABELS[state.badge] ?? "");
  if (state.category) parts.push(categories.find((c) => c.slug === state.category)?.name ?? "");
  const text = parts.filter(Boolean).join(" in ");
  if (state.seller && storeName) return text ? `${text} from ${storeName}` : storeName;
  return text;
}

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const state = parseSearch(await searchParams);
  return { title: state.q ? `Results for "${state.q}"` : "Shop all products" };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const state = parseSearch(await searchParams);
  const filterQuery = new URLSearchParams();
  for (const key of ["q", "category", "seller", "deals", "badge"] as const) if (state[key]) filterQuery.set(key, state[key]);

  const [results, filters, categories] = await Promise.all([
    apiGet<ProductPage>(`/products?${apiQuery(state)}`),
    apiGet<SearchFilters>(`/search/filters?${filterQuery}`),
    apiGet<Category[]>("/categories", { revalidate: 300 }),
  ]);

  if (!results.ok || !filters.ok) {
    return (
      <div className="mx-auto max-w-375 px-4 py-10 md:px-6">
        <ErrorState title="Search isn't responding" message={results.ok ? (filters as { message: string }).message : results.message} />
      </div>
    );
  }

  const page = results.data;
  const storeName = state.seller ? page.items[0]?.seller.name : undefined;
  const label = headline(state, categories.ok ? categories.data : [], storeName);
  const activeCount =
    state.brand.length + state.facet.length + [state.min_price || state.max_price, state.min_rating, state.delivery, state.in_stock].filter(Boolean).length;
  let popular: ProductPage["items"] = [];
  if (page.total === 0) {
    const fallback = await apiGet<ProductPage>("/products?per_page=4", { revalidate: 60 });
    popular = fallback.ok ? fallback.data.items : [];
  }
  const spotlight = page.items.find((p) => p.deal);

  return (
    <SearchNavProvider>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-375 space-y-3 px-4 py-3 md:px-6">
          <SortBar state={state} total={page.total} label={label} filters={filters.data} activeCount={activeCount} />
          <ActiveFilters state={state} filters={filters.data} />
        </div>
      </div>

      <div className="mx-auto grid max-w-375 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="rounded-card bg-surface p-5 shadow-card">
            <FilterSidebar key={withChanges(state, {})} state={state} filters={filters.data} />
          </div>
        </aside>

        <ResultsArea>
          <h1 className="sr-only">{label ? `Results for ${label}` : "All products"}</h1>
          {page.total === 0 ? (
            <NoResults state={state} popular={popular} />
          ) : (
            <div className="space-y-5">
              {spotlight && state.page === 1 && <DealSpotlight product={spotlight} />}
              <ResultsGrid products={page.items} view={state.view} />
              <Pagination state={state} pages={page.pages} total={page.total} />
            </div>
          )}
        </ResultsArea>
      </div>
    </SearchNavProvider>
  );
}
