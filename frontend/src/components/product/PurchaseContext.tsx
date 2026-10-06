"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { ProductDetail, Variant } from "@/types/api";

type Purchase = {
  product: ProductDetail;
  color: Variant | null;
  edition: Variant | null;
  setColor: (v: Variant) => void;
  setEdition: (v: Variant) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  withPlan: boolean;
  setWithPlan: (b: boolean) => void;
  /** Display price for the current selection; the server recomputes it in the cart. */
  unitPrice: number;
  listPrice: number | null;
  stock: number;
};

const PurchaseContext = createContext<Purchase | null>(null);

const firstInStock = (list: Variant[]) => list.find((v) => v.stock > 0) ?? list[0] ?? null;

export function PurchaseProvider({ product, children }: { product: ProductDetail; children: ReactNode }) {
  const [color, setColor] = useState<Variant | null>(firstInStock(product.colors));
  const [edition, setEdition] = useState<Variant | null>(product.editions[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [withPlan, setWithPlan] = useState(false);

  const value = useMemo<Purchase>(() => {
    const delta = (color?.price_delta_cents ?? 0) + (edition?.price_delta_cents ?? 0);
    const stock = color ? color.stock : product.stock;
    return {
      product,
      color,
      edition,
      setColor: (v) => {
        setColor(v);
        setQuantity(1);
      },
      setEdition,
      quantity: Math.min(quantity, Math.max(stock, 1)),
      setQuantity,
      withPlan,
      setWithPlan,
      unitPrice: product.price_cents + delta,
      listPrice: product.list_price_cents ? product.list_price_cents + delta : null,
      stock,
    };
  }, [product, color, edition, quantity, withPlan]);

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchase(): Purchase {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchase must be used inside PurchaseProvider");
  return ctx;
}
