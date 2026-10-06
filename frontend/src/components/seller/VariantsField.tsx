"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { FieldError, sellerInput } from "./StartSellingForm";

export type VariantDraft = { kind: "color" | "edition"; label: string; delta: string; stock: string };

/** Rows of kind (color / edition), label, price change and stock. */
export function VariantsField({
  variants,
  onChange,
  error,
}: {
  variants: VariantDraft[];
  onChange: (v: VariantDraft[]) => void;
  error?: string;
}) {
  const update = (i: number, patch: Partial<VariantDraft>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  return (
    <fieldset>
      <legend className="text-sm font-bold">Variants (optional)</legend>
      <p className="mt-0.5 text-sm text-ink-muted">
        Colors have their own stock. Editions change the price (e.g. a bundle at +$30.00).
      </p>
      {variants.length > 0 && (
        <ul className="mt-3 space-y-3">
          {variants.map((v, i) => (
            <li key={i} className="grid grid-cols-2 gap-2 rounded-card border border-line p-3 sm:grid-cols-[8rem_1fr_7rem_6rem_auto] sm:items-end">
              <label className="text-xs font-semibold text-ink-muted">
                Kind
                <select value={v.kind} onChange={(e) => update(i, { kind: e.target.value as VariantDraft["kind"] })} className={`${sellerInput(false)} mt-1 h-11 text-sm`}>
                  <option value="color">Color</option>
                  <option value="edition">Edition</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Label
                <input value={v.label} onChange={(e) => update(i, { label: e.target.value })} placeholder={v.kind === "color" ? "Midnight Black" : "Traveler Bundle"} className={`${sellerInput(false)} mt-1 h-11 text-sm`} />
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Price change ($)
                <input inputMode="decimal" value={v.delta} onChange={(e) => update(i, { delta: e.target.value })} placeholder="0.00" className={`${sellerInput(false)} mt-1 h-11 text-sm`} />
              </label>
              <label className="text-xs font-semibold text-ink-muted">
                Stock
                <input inputMode="numeric" value={v.stock} onChange={(e) => update(i, { stock: e.target.value })} placeholder="0" className={`${sellerInput(false)} mt-1 h-11 text-sm`} />
              </label>
              <button type="button" onClick={() => onChange(variants.filter((_, j) => j !== i))} aria-label={`Remove variant ${v.label || i + 1}`} className="col-span-2 grid h-11 place-items-center rounded-control text-danger hover:bg-deal-soft sm:col-span-1 sm:w-11">
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={variants.length >= 12}
        onClick={() => onChange([...variants, { kind: "color", label: "", delta: "0", stock: "0" }])}
      >
        <Plus aria-hidden="true" className="size-4" /> Add variant
      </Button>
      <FieldError id="variants-error" message={error} />
    </fieldset>
  );
}
