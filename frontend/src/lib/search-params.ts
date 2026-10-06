/**
 * Search URL state (PRD 4.3): everything lives in the query string so results are
 * shareable and the back button works. Pure helpers, usable on server and client.
 */

export type SearchState = {
  q: string;
  category: string;
  brand: string[];
  min_price: string;
  max_price: string;
  min_rating: string;
  delivery: string;
  in_stock: string;
  deals: string;
  badge: string;
  facet: string[];
  sort: string;
  page: number;
  per_page: number;
  view: "grid" | "list";
};

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export const PER_PAGE_OPTIONS = [12, 16, 24, 48];

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Avg. Customer Review" },
  { value: "newest", label: "Newest Arrivals" },
];

export function parseSearch(raw: Raw): SearchState {
  const page = Number.parseInt(first(raw.page), 10);
  const perPage = Number.parseInt(first(raw.per_page), 10);
  return {
    q: first(raw.q).slice(0, 100),
    category: first(raw.category),
    brand: all(raw.brand),
    min_price: first(raw.min_price).replace(/\D/g, ""),
    max_price: first(raw.max_price).replace(/\D/g, ""),
    min_rating: first(raw.min_rating),
    delivery: first(raw.delivery),
    in_stock: first(raw.in_stock),
    deals: first(raw.deals),
    badge: first(raw.badge),
    facet: all(raw.facet),
    sort: SORT_OPTIONS.some((o) => o.value === first(raw.sort)) ? first(raw.sort) : "featured",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    per_page: PER_PAGE_OPTIONS.includes(perPage) ? perPage : 16,
    view: first(raw.view) === "list" ? "list" : "grid",
  };
}

/** Query string for the API (only the keys it understands). */
export function apiQuery(s: SearchState): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number) => v !== "" && v !== undefined && p.set(k, String(v));
  set("q", s.q);
  set("category", s.category);
  s.brand.forEach((b) => p.append("brand", b));
  set("min_price", s.min_price);
  set("max_price", s.max_price);
  set("min_rating", s.min_rating);
  set("delivery", s.delivery);
  if (s.in_stock) p.set("in_stock", "true");
  set("deals", s.deals);
  set("badge", s.badge);
  s.facet.forEach((f) => p.append("facet", f));
  if (s.sort !== "featured") p.set("sort", s.sort);
  p.set("page", String(s.page));
  p.set("per_page", String(s.per_page));
  return p;
}

/** /search URL for a state; defaults are left out to keep links short. */
export function searchHref(s: SearchState): string {
  const p = new URLSearchParams();
  const set = (k: string, v: string) => v && p.set(k, v);
  set("q", s.q);
  set("category", s.category);
  s.brand.forEach((b) => p.append("brand", b));
  set("min_price", s.min_price);
  set("max_price", s.max_price);
  set("min_rating", s.min_rating);
  set("delivery", s.delivery);
  set("in_stock", s.in_stock);
  set("deals", s.deals);
  set("badge", s.badge);
  s.facet.forEach((f) => p.append("facet", f));
  if (s.sort !== "featured") p.set("sort", s.sort);
  if (s.page > 1) p.set("page", String(s.page));
  if (s.per_page !== 16) p.set("per_page", String(s.per_page));
  if (s.view === "list") p.set("view", "list");
  const qs = p.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Change some fields; any filter change goes back to page 1. */
export function withChanges(s: SearchState, changes: Partial<SearchState>): string {
  const keepPage = Object.keys(changes).every((k) => k === "page" || k === "view");
  return searchHref({ ...s, ...(keepPage ? {} : { page: 1 }), ...changes });
}

export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function hasFilters(s: SearchState): boolean {
  return Boolean(
    s.brand.length || s.min_price || s.max_price || s.min_rating || s.delivery || s.in_stock || s.facet.length,
  );
}

/** "Clear all filters" keeps the search box query and department. */
export function clearFilters(s: SearchState): string {
  return withChanges(s, {
    brand: [],
    min_price: "",
    max_price: "",
    min_rating: "",
    delivery: "",
    in_stock: "",
    facet: [],
  });
}
