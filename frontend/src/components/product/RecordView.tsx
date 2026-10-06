"use client";

import { useEffect } from "react";

import { pushRecent } from "@/lib/recent";

/** Remembers this product for "Keep shopping for" on the home page (this browser only). */
export function RecordView({ slug, title, image, price }: { slug: string; title: string; image: string | null; price: number }) {
  useEffect(() => {
    pushRecent({ slug, title, image, price_cents: price });
  }, [slug, title, image, price]);
  return null;
}
