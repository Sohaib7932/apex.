"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/search/ProductCard";
import { Carousel } from "@/components/ui/Carousel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { api } from "@/lib/api-client";
import type { ProductSummary } from "@/types/api";

/** "Customers who bought items in your cart also bought" (same categories, not already in the cart). */
export function CartRecommendations({ productIds }: { productIds: number[] }) {
  const key = productIds.join(",");
  const [items, setItems] = useState<{ key: string; products: ProductSummary[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<ProductSummary[]>(`/products/also-bought?ids=${key}`)
      .then((products) => !cancelled && setItems({ key, products }))
      .catch(() => !cancelled && setItems({ key, products: [] }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const products = items?.products ?? [];
  if (!products.length) return null;
  return (
    <section className="pt-4">
      <SectionHeading
        title="Customers who bought items in your cart also bought"
        subtitle="Picked from the same departments as your cart"
      />
      <Carousel label="Recommended for your cart">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} sizes="(max-width: 640px) 72vw, 24vw" />
        ))}
      </Carousel>
    </section>
  );
}
