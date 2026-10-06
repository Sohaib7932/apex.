import { DealsGrid } from "@/components/home/DealsGrid";
import { DepartmentChips } from "@/components/home/DepartmentChips";
import { FeaturedBrand } from "@/components/home/FeaturedBrand";
import { FlashDeals } from "@/components/home/FlashDeals";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { TrustBadges } from "@/components/home/TrustBadges";
import { DeliveryBar } from "@/components/layout/DeliveryBar";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import type { HomePayload } from "@/types/api";

export default async function HomePage() {
  const res = await apiGet<HomePayload>("/home", { revalidate: 60 });
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-375 px-4 py-10 md:px-6">
        <ErrorState title="The store is taking a moment" message={res.message} />
      </div>
    );
  }
  const home = res.data;
  return (
    <>
      <DeliveryBar />
      <HeroBanner spotlight={home.hero} />
      <DepartmentChips departments={home.departments} />
      <DealsGrid deals={home.deals} />
      <ProductCarousel
        tag="Top ranked"
        title="Trending in Electronics & Computing"
        subtitle="The fastest-moving tech on Apex this month"
        products={home.trending}
      />
      <FlashDeals products={home.flash_deals} total={home.flash_deal_count} />
      {home.featured_brand && <FeaturedBrand data={home.featured_brand} />}
      <TrustBadges />
    </>
  );
}
