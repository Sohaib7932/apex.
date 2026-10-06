import type { Metadata } from "next";

import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Shopping Cart" };

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const { checkout } = await searchParams;
  return (
    <div className="mx-auto max-w-375 px-4 py-6 md:px-6">
      <CartView cancelled={checkout === "cancelled"} />
    </div>
  );
}
