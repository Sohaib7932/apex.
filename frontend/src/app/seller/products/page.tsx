import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { ProductsTable } from "@/components/seller/ProductsTable";
import { SellerPageHeader } from "@/components/seller/SellerShell";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { apiGet, toQuery } from "@/lib/api-server";
import { requireSeller } from "@/lib/guards";
import type { SellerProductPage } from "@/types/api";

export const metadata: Metadata = { title: "Products" };

const STATUSES = ["all", "published", "draft", "low_stock"];

export default async function SellerProductsPage({ searchParams }: PageProps<"/seller/products">) {
  await requireSeller("/seller/products");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const res = await apiGet<SellerProductPage>(`/seller/products${toQuery({ q, status, page })}`, { auth: true });

  return (
    <>
      <SellerPageHeader
        title="Products"
        subtitle="Everything you sell. Drafts are hidden from the store until you publish them."
        action={
          <ButtonLink href="/seller/products/new" variant="primary">
            <Plus aria-hidden="true" className="size-4" /> Add product
          </ButtonLink>
        }
      />
      {res.ok ? (
        <ProductsTable key={`${q}|${status}|${page}`} data={res.data} q={q} status={status} />
      ) : (
        <ErrorState title="Your products didn't load" message={res.message} />
      )}
    </>
  );
}
