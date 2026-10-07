import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/seller/ProductForm";
import { SellerPageHeader } from "@/components/seller/SellerShell";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { requireSeller } from "@/lib/guards";
import type { Brand, Category, SellerProduct } from "@/types/api";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/seller/products/[id]">) {
  const { id } = await params;
  await requireSeller(`/seller/products/${id}`);
  if (!/^\d+$/.test(id)) notFound();
  const [product, categories, brands] = await Promise.all([
    apiGet<SellerProduct>(`/seller/products/${id}`, { auth: true }),
    apiGet<Category[]>("/categories", { revalidate: 300 }),
    apiGet<Brand[]>("/brands"),
  ]);
  // Another store's product is a 404 from the API, so it looks like it doesn't exist.
  if (!product.ok && product.status === 404) notFound();
  if (!product.ok || !categories.ok || !brands.ok) {
    return <ErrorState title="This product didn't load" message={product.ok ? undefined : product.message} />;
  }
  return (
    <>
      <SellerPageHeader
        title="Edit product"
        subtitle={product.data.title}
        action={
          product.data.status === "published" && (
            <Link href={`/product/${product.data.slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
              View in store <ExternalLink aria-hidden="true" className="size-4" />
            </Link>
          )
        }
      />
      <ProductForm product={product.data} categories={categories.data} brands={brands.data} />
    </>
  );
}
