"use client";

import { Check } from "lucide-react";

/** Fixed set, matches BADGES on the API. */
export const BADGE_OPTIONS = ["Best Seller", "Apex Choice", "Limited Deal", "New Arrival", "Top Rated"];

export function BadgesField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">Badges (optional)</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {BADGE_OPTIONS.map((b) => {
          const on = value.includes(b);
          return (
            <button
              key={b}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== b) : [...value, b])}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-pill border px-3 text-sm font-semibold ${
                on ? "border-seller bg-seller text-on-seller" : "border-line bg-surface hover:bg-seller-soft"
              }`}
            >
              {on && <Check aria-hidden="true" className="size-4" />}
              {b}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
