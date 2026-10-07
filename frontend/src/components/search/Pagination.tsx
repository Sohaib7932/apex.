"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { PER_PAGE_OPTIONS, withChanges, type SearchState } from "@/lib/search-params";

import { useSearchNav } from "./SearchNav";

/** 1 … 4 5 6 … 20 */
function pageList(current: number, pages: number): (number | "gap")[] {
  const set = new Set([1, pages, current - 1, current, current + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ state, pages, total }: { state: SearchState; pages: number; total: number }) {
  const { navigate } = useSearchNav();
  const from = total ? (state.page - 1) * state.per_page + 1 : 0;
  const to = Math.min(state.page * state.per_page, total);
  const navBtn =
    "inline-flex h-11 items-center gap-1 rounded-control px-3 text-sm font-semibold hover:bg-surface-tint aria-disabled:pointer-events-none aria-disabled:text-ink-subtle";

  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-surface p-4 shadow-card md:flex-row md:justify-between">
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Items per page
        <select
          value={state.per_page}
          onChange={(e) => navigate(withChanges(state, { per_page: Number(e.target.value) }))}
          className="h-11 rounded-control border border-line bg-surface px-2 font-semibold text-ink"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Link
            href={withChanges(state, { page: state.page - 1 })}
            aria-disabled={state.page <= 1}
            tabIndex={state.page <= 1 ? -1 : undefined}
            className={navBtn}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
          {pageList(state.page, pages).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-ink-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={withChanges(state, { page: p })}
                aria-current={p === state.page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={`grid size-11 place-items-center rounded-control text-sm font-bold ${
                  p === state.page ? "bg-chrome text-on-chrome" : "hover:bg-surface-tint"
                }`}
              >
                {p}
              </Link>
            ),
          )}
          <Link
            href={withChanges(state, { page: state.page + 1 })}
            aria-disabled={state.page >= pages}
            tabIndex={state.page >= pages ? -1 : undefined}
            className={navBtn}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </nav>
      )}

      <p className="text-sm text-ink-muted">
        Showing <span className="font-bold text-ink">{from}-{to}</span> of {total.toLocaleString("en-US")}
      </p>
    </div>
  );
}
