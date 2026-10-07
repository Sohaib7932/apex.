"use client";

import { Check, ChevronLeft, Search, Star, Zap } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { clearFilters, hasFilters, toggle, withChanges, type SearchState } from "@/lib/search-params";
import type { SearchFilters } from "@/types/api";

import { useSearchNav } from "./SearchNav";

function Group({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line py-5 first:pt-0 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
  icon,
}: {
  label: ReactNode;
  count?: number;
  checked: boolean;
  onChange: () => void;
  icon?: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-1 text-sm hover:bg-surface-tint">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-5 shrink-0 cursor-pointer accent-[var(--color-primary)]"
      />
      {icon}
      <span className="min-w-0 flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-ink-muted tabular-nums">{count}</span>}
    </label>
  );
}

function OptionButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 w-full items-center gap-2 rounded-control px-1 text-left text-sm hover:bg-surface-tint ${
        active ? "font-bold text-accent-text" : "text-ink"
      }`}
    >
      <span className="flex flex-1 items-center gap-1.5">{children}</span>
      {count !== undefined && <span className="text-xs font-normal text-ink-muted tabular-nums">{count}</span>}
      {active && <Check aria-hidden="true" className="size-4" />}
    </button>
  );
}

export function FilterSidebar({ state, filters }: { state: SearchState; filters: SearchFilters }) {
  const { navigate } = useSearchNav();
  // Local copy so checkboxes respond instantly; re-keyed from the URL by the parent.
  const [draft, setDraft] = useState(state);
  const [brandQuery, setBrandQuery] = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [minPrice, setMinPrice] = useState(state.min_price);
  const [maxPrice, setMaxPrice] = useState(state.max_price);
  const uid = useId();

  const apply = (changes: Partial<SearchState>) => {
    const next = { ...draft, ...changes, page: 1 };
    setDraft(next);
    navigate(withChanges(draft, changes));
  };

  const brands = filters.brands.filter((b) => b.label.toLowerCase().includes(brandQuery.toLowerCase()));
  const visibleBrands = showAllBrands || brandQuery ? brands : brands.slice(0, 7);

  return (
    <div className="text-ink">
      {hasFilters(state) && (
        <button
          type="button"
          onClick={() => navigate(clearFilters(state))}
          className="mb-4 min-h-11 text-sm font-bold text-accent-text hover:underline"
        >
          Clear all filters
        </button>
      )}

      {filters.categories.length > 0 && (
        <Group title="Department">
          {draft.category && (
            <OptionButton active={false} onClick={() => apply({ category: "" })}>
              <ChevronLeft aria-hidden="true" className="size-4" /> Any department
            </OptionButton>
          )}
          {filters.categories.map((c) => (
            <OptionButton
              key={c.value}
              active={draft.category === c.value}
              count={c.count}
              onClick={() => apply({ category: draft.category === c.value ? "" : c.value })}
            >
              {c.label}
            </OptionButton>
          ))}
        </Group>
      )}

      <Group title="Delivery Day">
        <CheckRow
          label={
            <>
              <span className="font-semibold">Apex One-Day</span>
              <span className="block text-xs text-ink-muted">Get it tomorrow</span>
            </>
          }
          icon={<Zap aria-hidden="true" className="size-4 shrink-0 fill-primary text-primary" />}
          count={filters.one_day_count}
          checked={draft.delivery === "one_day"}
          onChange={() => apply({ delivery: draft.delivery === "one_day" ? "" : "one_day" })}
        />
        <CheckRow
          label="In stock only"
          count={filters.in_stock_count}
          checked={!!draft.in_stock}
          onChange={() => apply({ in_stock: draft.in_stock ? "" : "1" })}
        />
      </Group>

      <Group title="Customer Reviews">
        {filters.ratings.map((r) => (
          <OptionButton
            key={r.value}
            active={draft.min_rating === r.value}
            count={r.count}
            onClick={() => apply({ min_rating: draft.min_rating === r.value ? "" : r.value })}
          >
            <span className="flex text-star" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`size-4 ${i <= Number(r.value) ? "fill-current" : "text-line"}`} />
              ))}
            </span>
            <span className="sr-only">{r.value} stars</span>& Up
          </OptionButton>
        ))}
      </Group>

      {filters.brands.length > 0 && (
        <Group
          title="Brand"
          action={
            draft.brand.length > 0 && (
              <button type="button" onClick={() => apply({ brand: [] })} className="text-sm font-semibold text-accent-text hover:underline">
                Clear
              </button>
            )
          }
        >
          {filters.brands.length > 7 && (
            <label className="relative mb-2 block">
              <span className="sr-only">Search brands</span>
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Search brands"
                className="h-11 w-full rounded-control border border-line bg-surface-tint pr-9 pl-3 text-sm outline-none focus:border-primary"
              />
              <Search aria-hidden="true" className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" />
            </label>
          )}
          {visibleBrands.map((b) => (
            <CheckRow
              key={b.value}
              label={b.label}
              count={b.count}
              checked={draft.brand.includes(b.value)}
              onChange={() => apply({ brand: toggle(draft.brand, b.value) })}
            />
          ))}
          {!brandQuery && brands.length > 7 && (
            <button
              type="button"
              onClick={() => setShowAllBrands((v) => !v)}
              className="mt-1 min-h-11 text-sm font-semibold text-accent-text hover:underline"
            >
              {showAllBrands ? "See fewer" : `See all ${brands.length} brands`}
            </button>
          )}
          {brandQuery && visibleBrands.length === 0 && <p className="text-sm text-ink-muted">No brands match.</p>}
        </Group>
      )}

      <Group title="Price">
        {filters.prices.map((p) => {
          const [lo, hi] = p.value.split("-");
          const active = draft.min_price === lo && draft.max_price === hi;
          return (
            <OptionButton
              key={p.value}
              active={active}
              count={p.count}
              onClick={() => apply(active ? { min_price: "", max_price: "" } : { min_price: lo, max_price: hi })}
            >
              {p.label}
            </OptionButton>
          );
        })}
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            let lo = minPrice.replace(/\D/g, "");
            let hi = maxPrice.replace(/\D/g, "");
            if (lo && hi && Number(lo) > Number(hi)) [lo, hi] = [hi, lo];
            apply({ min_price: lo, max_price: hi });
          }}
        >
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-ink-muted">Min ($)</span>
            <input
              id={`${uid}-min`}
              inputMode="numeric"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="h-11 w-full rounded-control border border-line px-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold text-ink-muted">Max ($)</span>
            <input
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
              className="h-11 w-full rounded-control border border-line px-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <button type="submit" className="h-11 rounded-control bg-chrome px-4 text-sm font-bold text-on-chrome hover:bg-chrome-2">
            Go
          </button>
        </form>
      </Group>

      {filters.facets.map((g) => (
        <Group key={g.key} title={g.label}>
          {g.values.map((v) => {
            const token = `${g.key}:${v.value}`;
            return (
              <CheckRow
                key={token}
                label={v.label}
                count={v.count}
                checked={draft.facet.includes(token)}
                onChange={() => apply({ facet: toggle(draft.facet, token) })}
              />
            );
          })}
        </Group>
      ))}
    </div>
  );
}
