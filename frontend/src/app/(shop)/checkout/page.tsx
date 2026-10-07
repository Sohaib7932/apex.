import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/CheckoutView";
import { apiGet } from "@/lib/api-server";
import { requireUser } from "@/lib/guards";
import type { Address, SavedAddress } from "@/types/api";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const saved = await apiGet<SavedAddress[]>("/addresses", { auth: true });
  const def = saved.ok ? (saved.data.find((a) => a.is_default) ?? saved.data[0]) : undefined;
  const initial: Address = def
    ? { full_name: def.full_name, line1: def.line1, line2: def.line2, city: def.city, state: def.state, zip: def.zip, phone: def.phone }
    : { full_name: user.name, line1: "", line2: "", city: "", state: "", zip: "", phone: "" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">Checkout</h1>
      <CheckoutView initialAddress={initial} />
    </div>
  );
}
