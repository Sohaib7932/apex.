"use client";

import { ChevronDown, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { departments } from "@/lib/nav";

function Form({ q = "", category = "" }: { q?: string; category?: string }) {
  return (
    <form
      action="/search"
      role="search"
      className="flex h-11 w-full min-w-0 overflow-hidden rounded-control bg-surface ring-primary focus-within:ring-2"
    >
      <label className="relative hidden shrink-0 sm:block">
        <span className="sr-only">Department</span>
        <select
          name="category"
          defaultValue={category}
          key={category}
          className="h-full max-w-40 appearance-none border-r border-line bg-surface-tint py-0 pr-7 pl-3 text-xs font-medium text-ink outline-none"
        >
          {departments.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-muted"
        />
      </label>
      <label className="flex min-w-0 flex-1">
        <span className="sr-only">Search Apex</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          key={q}
          maxLength={100}
          placeholder="Search products, brands and more"
          className="min-w-0 flex-1 bg-surface px-3 text-base text-ink outline-none placeholder:text-ink-subtle sm:text-sm"
        />
      </label>
      <button
        type="submit"
        aria-label="Search"
        className="flex w-12 shrink-0 items-center justify-center bg-primary text-on-primary hover:bg-primary-hover"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}

/** Plain GET form, so search works before JavaScript loads. Pre-filled on /search. */
export function SearchBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearch = pathname === "/search";
  return <Form q={onSearch ? (params.get("q") ?? "") : ""} category={onSearch ? (params.get("category") ?? "") : ""} />;
}

export function SearchBarFallback() {
  return <Form />;
}
