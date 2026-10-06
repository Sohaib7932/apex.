import type { Metadata } from "next";

import { SellerPageHeader } from "@/components/seller/SellerShell";
import { StoreSettingsForm } from "@/components/seller/StoreSettingsForm";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { requireSeller } from "@/lib/guards";
import type { Store } from "@/types/api";

export const metadata: Metadata = { title: "Store settings" };

export default async function StoreSettingsPage() {
  await requireSeller("/seller/settings");
  const res = await apiGet<Store>("/seller/store", { auth: true });
  return (
    <div className="max-w-3xl">
      <SellerPageHeader title="Store settings" subtitle="Your store name appears as “Sold by” on every product." />
      {res.ok ? <StoreSettingsForm store={res.data} /> : <ErrorState title="Settings didn't load" message={res.message} />}
    </div>
  );
}
