"use client";

import { Bookmark, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";

import { DeliveryLine } from "@/components/ui/DeliveryLine";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductImage } from "@/components/ui/ProductImage";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/format";
import type { CartLine } from "@/types/api";

const action =
  "inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-accent-text hover:bg-surface-tint";

function StockLabel({ line }: { line: CartLine }) {
  if (line.stock <= 0) return <span className="font-bold text-danger">Out of stock</span>;
  if (!line.in_stock) {
    return <span className="font-bold text-danger">Only {line.stock} available. Lower the quantity to check out.</span>;
  }
  if (line.stock <= 5) return <span className="font-bold text-deal">Only {line.stock} left in stock</span>;
  return <span className="inline-flex rounded-control bg-chrome px-1.5 py-0.5 text-2xs font-bold text-on-chrome">In Stock</span>;
}

export function CartItem({ line }: { line: CartLine }) {
  const { setQuantity, remove, setSaved, setSelected } = useCart();
  return (
    <article className="grid grid-cols-[auto_5.5rem_1fr] gap-3 py-5 sm:grid-cols-[auto_8rem_1fr_auto] sm:gap-4">
      <label className="pt-1">
        <span className="sr-only">Include {line.title} in checkout</span>
        <input
          type="checkbox"
          checked={line.selected}
          onChange={(e) => setSelected(line, e.target.checked)}
          className="size-5 cursor-pointer accent-[var(--color-primary)]"
        />
      </label>
      <Link href={`/product/${line.slug}`} tabIndex={-1} aria-hidden="true">
        <ProductImage src={line.image} alt="" sizes="8rem" className="aspect-square w-full rounded-control" />
      </Link>
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-semibold break-words">
          <Link href={`/product/${line.slug}`} className="hover:text-accent-text hover:underline">
            {line.title}
          </Link>
        </h3>
        <p className="text-sm">
          <StockLabel line={line} />
        </p>
        <DeliveryLine speed={line.delivery_speed} compact />
        <p className="text-sm text-ink-muted">
          Sold by <span className="text-ink">{line.seller_name}</span>
          {line.variant_label && (
            <>
              {" · "}
              <span className="text-ink">{line.variant_label}</span>
            </>
          )}
        </p>
        <div className="sm:hidden">
          <PriceTag cents={line.unit_price_cents} listCents={line.list_price_cents} size="sm" />
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 pt-2">
          <QuantityStepper
            value={line.quantity}
            max={Math.max(Math.min(line.stock, 30), line.quantity)}
            onChange={(n) => setQuantity(line, n)}
            onRemove={() => remove(line)}
            label={`Quantity for ${line.title}`}
          />
          <button type="button" className={action} onClick={() => remove(line)}>
            <Trash2 aria-hidden="true" className="size-4" /> Delete
          </button>
          <button type="button" className={action} onClick={() => setSaved(line, true)}>
            <Bookmark aria-hidden="true" className="size-4" /> Save for later
          </button>
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <PriceTag cents={line.unit_price_cents} listCents={null} size="sm" />
        {line.list_price_cents && line.list_price_cents > line.unit_price_cents && (
          <p className="text-xs text-ink-muted">
            <s>{money(line.list_price_cents)}</s>
          </p>
        )}
        {line.quantity > 1 && (
          <p className="mt-1 text-xs text-ink-muted">
            {money(line.line_total_cents)} for {line.quantity}
          </p>
        )}
      </div>
    </article>
  );
}

export function SavedItem({ line }: { line: CartLine }) {
  const { remove, setSaved } = useCart();
  return (
    <article className="flex h-full gap-3 rounded-card border border-line p-3">
      <Link href={`/product/${line.slug}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <ProductImage src={line.image} alt="" sizes="6rem" className="size-24 rounded-control" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 title={line.title} className="line-clamp-2 min-h-[2lh] text-sm font-semibold break-words">
          <Link href={`/product/${line.slug}`} className="hover:underline">
            {line.title}
          </Link>
        </h3>
        <p className="mt-1 text-base font-extrabold">{money(line.unit_price_cents)}</p>
        <p className="text-xs">
          <StockLabel line={line} />
        </p>
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          <button
            type="button"
            onClick={() => setSaved(line, false)}
            disabled={line.stock <= 0}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line px-3 text-sm font-bold hover:bg-surface-tint disabled:opacity-50"
          >
            <ShoppingCart aria-hidden="true" className="size-4" /> Move to Cart
          </button>
          <button type="button" onClick={() => remove(line)} className={action}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
