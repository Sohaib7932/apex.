import { cache } from "react";

import type { ProductDetail } from "@/types/api";

import { apiGet } from "./api-server";

/** One product request per render, shared by generateMetadata and the page. */
export const getProduct = cache((slug: string) => apiGet<ProductDetail>(`/products/${encodeURIComponent(slug)}`));
