import { ButtonLink } from "@/components/ui/Button";

export default function SellerNotFound() {
  return (
    <div className="rounded-card bg-surface p-10 text-center shadow-card">
      <p className="text-sm font-bold uppercase tracking-wide text-seller">Not found</p>
      <h1 className="mt-2 text-2xl font-extrabold">That isn&apos;t in your store</h1>
      <p className="mt-2 text-sm text-ink-muted">It may have been deleted, or it belongs to another store.</p>
      <ButtonLink href="/seller/products" variant="seller" className="mt-6">
        Back to your products
      </ButtonLink>
    </div>
  );
}
