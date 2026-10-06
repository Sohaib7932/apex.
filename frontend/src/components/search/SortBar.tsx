"use client";

import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { SORT_OPTIONS, withChanges, type SearchState } from "@/lib/search-params";
import type { SearchFilters } from "@/types/api";

import { FilterSidebar } from "./FilterSidebar";
import { useSearchNav } from "./SearchNav";

function countLabel(state: SearchState, total: number, label: string): string {
  if (total === 0) return "No results";
  const from = (state.page - 1) * state.per_page + 1;
  const to = Math.min(state.page * state.per_page, total);
  return `${from}-${to} of ${total.toLocaleString("en-US")} results${label ? ` for ` : ""}`;
}

export function SortBar({
  state,
  total,
  label,
  filters,
  activeCount,
}: {
  state: SearchState;
  total: number;
  label: string;
  filters: SearchFilters;
  activeCount: number;
}) {
  const { navigate } = useSearchNav();
  const drawer = useRef<HTMLDialogElement>(null);
  const viewLink = (view: "grid" | "list", Icon: typeof List, name: string) => (
    <Link
      href={withChanges(state, { view })}
      scroll={false}
      aria-label={`${name} view`}
      aria-current={state.view === view ? "true" : undefined}
      className={`grid size-10 place-items-center rounded-control border ${
        state.view === view ? "border-ink bg-surface-tint-2" : "border-line bg-surface hover:bg-surface-tint"
      }`}
    >
      <Icon aria-hidden="true" className="size-5" />
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink" aria-live="polite">
        {countLabel(state, total, label)}
        {label && total > 0 && <span className="font-bold text-accent-text">&ldquo;{label}&rdquo;</span>}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => drawer.current?.showModal()}
          className="flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-bold lg:hidden"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-pill bg-primary text-2xs text-on-primary">{activeCount}</span>
          )}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-ink-muted sm:inline">Sort by</span>
          <select
            value={state.sort}
            onChange={(e) => navigate(withChanges(state, { sort: e.target.value }))}
            aria-label="Sort results"
            className="h-10 rounded-control border border-line bg-surface px-2 text-sm font-semibold outline-none focus:border-primary"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="hidden gap-1 sm:flex">
          {viewLink("grid", LayoutGrid, "Grid")}
          {viewLink("list", List, "List")}
        </div>
      </div>

      <dialog
        ref={drawer}
        aria-label="Filters"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-0 ml-auto h-dvh max-h-none w-[min(24rem,92vw)] bg-surface p-0 text-ink shadow-pop backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-lg font-bold">Filters</h2>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => drawer.current?.close()}
              className="grid size-11 place-items-center rounded-control hover:bg-surface-tint"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FilterSidebar key={withChanges(state, {})} state={state} filters={filters} />
          </div>
          <div className="border-t border-line p-4">
            <button
              type="button"
              onClick={() => drawer.current?.close()}
              className="h-12 w-full rounded-control bg-primary text-base font-bold text-on-primary hover:bg-primary-hover"
            >
              Show {total.toLocaleString("en-US")} results
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
