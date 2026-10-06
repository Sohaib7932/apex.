"use client";

import { Check } from "lucide-react";

import { discountPct, money } from "@/lib/format";
import { PriceTag } from "@/components/ui/PriceTag";

import { usePurchase } from "./PurchaseContext";

export function PriceBox() {
  const { unitPrice, listPrice } = usePurchase();
  const pct = discountPct(unitPrice, listPrice);
  return (
    <div className="rounded-card bg-surface-tint-2 p-4">
      <PriceTag cents={unitPrice} listCents={null} size="xl" showDiscount={false} />
      {pct > 0 && (
        <span className="ml-3 rounded-control bg-deal-soft px-2 py-0.5 align-middle text-base font-bold text-deal">
          -{pct}%
        </span>
      )}
      {listPrice && listPrice > unitPrice && (
        <p className="mt-1 text-sm text-ink-muted">
          Typical list price: <s>{money(listPrice)}</s>
          <span className="ml-2 rounded-control bg-surface px-1.5 py-0.5 text-xs font-semibold text-ink">No hidden fees</span>
        </p>
      )}
      <p className="mt-2 text-sm text-ink-muted">Prices include all fees. Tax is calculated at checkout.</p>
    </div>
  );
}

/** Color swatches and edition cards (PRD 4.4). Changing an edition changes the price. */
export function VariantPicker() {
  const { product, color, edition, setColor, setEdition } = usePurchase();
  if (!product.colors.length && !product.editions.length) return null;
  return (
    <div className="space-y-5">
      {product.colors.length > 0 && (
        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-sm">
            <span>
              Color: <span className="font-bold">{color?.label}</span>
            </span>
            {color && (
              <span className={`text-xs font-bold uppercase ${color.stock > 0 ? "text-success" : "text-danger"}`}>
                {color.stock > 0 ? "In stock" : "Out of stock"}
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => {
              const active = c.id === color?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={active}
                  aria-label={`${c.label}${c.stock <= 0 ? " (out of stock)" : ""}`}
                  title={c.label}
                  className={`relative grid size-12 place-items-center rounded-control border-2 p-1 ${
                    active ? "border-ink" : "border-line hover:border-ink-subtle"
                  } ${c.stock <= 0 ? "opacity-40" : ""}`}
                >
                  <span className="size-full rounded-[4px] border border-black/10" style={{ background: c.swatch ?? "#ccc" }} />
                  {active && (
                    <Check aria-hidden="true" className="absolute size-4 rounded-pill bg-surface p-0.5 text-ink" />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {product.editions.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm">
            Edition / Configuration: <span className="font-bold">{edition?.label}</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.editions.map((e) => {
              const active = e.id === edition?.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEdition(e)}
                  aria-pressed={active}
                  className={`rounded-control border-2 p-3 text-left ${
                    active ? "border-ink bg-surface" : "border-line bg-surface hover:border-ink-subtle"
                  }`}
                >
                  <span className="flex justify-between gap-2 text-sm font-bold">
                    {e.label}
                    <span>{money(product.price_cents + e.price_delta_cents + (color?.price_delta_cents ?? 0))}</span>
                  </span>
                  {e.detail && <span className="mt-1 block text-xs text-ink-muted">{e.detail}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
