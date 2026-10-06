import { ProductCard } from "@/components/search/ProductCard";
import { Carousel } from "@/components/ui/Carousel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { ProductSummary } from "@/types/api";

export function ProductCarousel({
  tag,
  title,
  subtitle,
  products,
}: {
  tag?: string;
  title: string;
  subtitle?: string;
  products: ProductSummary[];
}) {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-375 px-4 py-10 md:px-6">
      <SectionHeading tag={tag} title={title} subtitle={subtitle} />
      <Carousel label={title}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} sizes="(max-width: 640px) 72vw, (max-width: 1024px) 42vw, 24vw" />
        ))}
      </Carousel>
    </section>
  );
}
