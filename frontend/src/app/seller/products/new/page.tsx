import type { Metadata } from "next";

import { ProductForm } from "@/components/seller/ProductForm";
import { SellerPageHeader } from "@/components/seller/SellerShell";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { requireSeller } from "@/lib/guards";
import type { Brand, Category } from "@/types/api";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireSeller("/seller/products/new");
  const [categories, brands] = await Promise.all([
    apiGet<Category[]>("/categories", { revalidate: 300 }),
    apiGet<Brand[]>("/brands"),
  ]);
  return (
    <>
      <SellerPageHeader title="Add a product" subtitle="Publish now, or save a draft and finish it later." />
      {categories.ok && brands.ok ? (
        <ProductForm categories={categories.data} brands={brands.data} />
      ) : (
        <ErrorState title="The form didn't load" message="We couldn't load categories and brands." />
      )}
    </>
  );
}
