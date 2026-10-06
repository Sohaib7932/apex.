import type { Metadata } from "next";

import { ModeSwitch } from "@/components/layout/ModeSwitch";

export const metadata: Metadata = { title: "Style guide", robots: { index: false } };

const swatches: { group: string; tokens: string[] }[] = [
  { group: "Text and surfaces", tokens: ["ink", "ink-muted", "canvas", "surface", "surface-tint", "surface-tint-2", "surface-tint-3", "line"] },
  { group: "Chrome", tokens: ["chrome", "chrome-2", "on-chrome", "on-chrome-muted"] },
  { group: "Buying", tokens: ["primary", "primary-hover", "primary-soft", "on-primary", "accent-text"] },
  { group: "Status", tokens: ["star", "deal", "deal-soft", "success", "danger"] },
  { group: "Selling (placeholder until seller-toggle.png is sampled)", tokens: ["seller", "seller-hover", "seller-soft", "on-seller", "switch-track"] },
];

/** Internal reference page for the design tokens (Milestone 1). Not linked from the UI. */
export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-10 px-4 py-10 md:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Design tokens</h1>

      {swatches.map(({ group, tokens }) => (
        <section key={group}>
          <h2 className="mb-3 text-lg font-bold">{group}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {tokens.map((t) => (
              <li key={t} className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="h-14 border-b border-line" style={{ background: `var(--color-${t})` }} />
                <p className="px-2 py-1.5 text-xs font-semibold">{t}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h2 className="mb-3 text-lg font-bold">Buying / Selling switch</h2>
        <p className="mb-3 text-sm text-ink-muted">Shown in the header for signed-in users only (from Milestone 5).</p>
        <div className="flex flex-wrap items-center gap-6 rounded-card bg-chrome p-5">
          <ModeSwitch hasStore mode="buying" />
          <ModeSwitch hasStore mode="selling" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-control bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover">
            Add to Cart
          </button>
          <button type="button" className="rounded-control bg-chrome px-5 py-2.5 text-sm font-bold text-on-chrome">
            Buy Now
          </button>
          <button type="button" className="rounded-control bg-surface-tint-2 px-5 py-2.5 text-sm font-bold text-ink">
            Secondary
          </button>
          <button type="button" className="rounded-control bg-seller px-5 py-2.5 text-sm font-bold text-on-seller hover:bg-seller-hover">
            Publish product
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Type scale</h2>
        <div className="space-y-2">
          <p className="text-4xl font-extrabold tracking-tight">Summer Technology Showcase</p>
          <p className="text-2xl font-bold">Trending in Electronics</p>
          <p className="text-base">Body text at 16px for descriptions and copy.</p>
          <p className="text-sm text-ink-muted">Secondary text at 14px.</p>
          <p className="text-2xs text-ink-muted">Smallest text at 12px: badges, meta labels.</p>
        </div>
      </section>
    </div>
  );
}
