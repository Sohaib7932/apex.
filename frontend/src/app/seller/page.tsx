import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { EarningsCard, RecentOrders, StatCards } from "@/components/seller/OverviewParts";
import { SalesChart } from "@/components/seller/SalesChart";
import { SellerPageHeader } from "@/components/seller/SellerShell";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { requireSeller } from "@/lib/guards";
import type { SellerOverview } from "@/types/api";

export const metadata: Metadata = { title: { absolute: "Overview | Apex Seller" } };

export default async function SellerOverviewPage() {
  await requireSeller("/seller");
  const res = await apiGet<SellerOverview>("/seller/overview", { auth: true });
  if (!res.ok) return <ErrorState title="Your overview didn't load" message={res.message} />;
  const data = res.data;
  return (
    <>
      <SellerPageHeader
        title="Overview"
        subtitle={`How ${data.store_name} is doing over the last 30 days`}
        action={
          <ButtonLink href="/seller/products/new" variant="primary">
            <Plus aria-hidden="true" className="size-4" /> Add a product
          </ButtonLink>
        }
      />
      <div className="space-y-4">
        <StatCards data={data} />
        <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
          <SalesChart days={data.daily} />
          <EarningsCard data={data} />
        </div>
        <RecentOrders orders={data.recent_orders} />
      </div>
    </>
  );
}
