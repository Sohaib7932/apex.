"use client";

import { Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { money } from "@/lib/format";
import type { ProductSummary } from "@/types/api";

/** The product plus two add-ons; prices are each item's own price (no fake bundle discount). */
export function FrequentlyBoughtTogether({ items }: { items: ProductSummary[] }) {
  const { add } = useCart();
  const { notify } = useToast();
  const [checked, setChecked] = useState(() => new Set(items.map((p) => p.id)));
  const [busy, setBusy] = useState(false);
  if (items.length < 2) return null;

  const chosen = items.filter((p) => checked.has(p.id) && p.stock > 0);
  const total = chosen.reduce((n, p) => n + p.price_cents, 0);
  const list = chosen.reduce((n, p) => n + (p.list_price_cents ?? p.price_cents), 0);

  return (
    <section aria-labelledby="fbt-title" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      <h2 id="fbt-title" className="text-xl font-extrabold tracking-tight">
        Frequently Bought Together
      </h2>
      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-center">
        <ul className="flex flex-1 flex-wrap items-start gap-2 sm:flex-nowrap">
          {items.map((p, i) => (
            <li key={p.id} className="flex min-w-0 flex-1 items-start gap-2">
              {i > 0 && <Plus aria-hidden="true" className="mt-12 size-5 shrink-0 text-ink-muted" />}
              <div className="min-w-0 flex-1 text-center">
                <Link href={`/product/${p.slug}`} className="block">
                  <ProductImage src={p.image} alt={p.title} sizes="(max-width: 640px) 30vw, 10rem" className="mx-auto aspect-square w-full max-w-36 rounded-control" />
                </Link>
                <label className="mt-2 flex cursor-pointer items-start justify-center gap-2 text-left text-xs sm:text-sm">
                  <input
                    type="checkbox"
                    checked={checked.has(p.id)}
                    disabled={p.stock <= 0}
                    onChange={() =>
                      setChecked((s) => {
                        const next = new Set(s);
                        if (next.has(p.id)) next.delete(p.id);
                        else next.add(p.id);
                        return next;
                      })
                    }
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold break-words">{i === 0 ? `This item: ${p.title}` : p.title}</span>
                    <span className="font-bold text-accent-text">{money(p.price_cents)}</span>
                  </span>
                </label>
              </div>
            </li>
          ))}
        </ul>
        <div className="rounded-card bg-surface-tint p-5 lg:w-72">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            {chosen.length === items.length ? `Total for all ${items.length}` : `Total for ${chosen.length} selected`}
          </p>
          <p className="mt-1 text-3xl font-extrabold">{money(total)}</p>
          {list > total && (
            <p className="text-sm text-accent-text">
              You save {money(list - total)} vs. list price
            </p>
          )}
          <Button
            className="mt-4 w-full"
            disabled={!chosen.length}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              let added = 0;
              for (const p of chosen) {
                if (await add(p.id, { silent: true })) added += 1;
              }
              setBusy(false);
              if (added) notify({ kind: "success", message: `Added ${added} items to cart`, action: { label: "View cart", href: "/cart" } });
            }}
          >
            <ShoppingCart aria-hidden="true" className="size-4" />
            {chosen.length === items.length ? `Add all ${items.length} to Cart` : `Add ${chosen.length} to Cart`}
          </Button>
        </div>
      </div>
    </section>
  );
}
