import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderDetailView } from "@/components/orders/OrderParts";
import { ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { requireUser } from "@/lib/guards";
import type { Order } from "@/types/api";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  await requireUser(`/orders/${id}`);
  if (!/^\d+$/.test(id)) notFound();
  const res = await apiGet<Order>(`/orders/${id}`, { auth: true });
  if (!res.ok && res.status === 404) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/orders" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
        <ChevronLeft aria-hidden="true" className="size-4" /> Your Orders
      </Link>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Order details</h1>
      {res.ok ? <OrderDetailView order={res.data} /> : <ErrorState title="We couldn't load this order" message={res.message} />}
    </div>
  );
}
