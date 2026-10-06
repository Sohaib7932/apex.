import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Confirmation } from "@/components/checkout/Confirmation";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  const { order } = await searchParams;
  const orderId = Number.parseInt(Array.isArray(order) ? order[0] : (order ?? ""), 10);
  await requireUser(`/checkout/success?order=${Number.isFinite(orderId) ? orderId : ""}`);
  if (!Number.isFinite(orderId)) redirect("/orders");
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Confirmation orderId={orderId} />
    </div>
  );
}
