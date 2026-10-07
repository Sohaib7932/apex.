"use client";

import { Lock, MapPin, ShoppingCart, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { CutoffCountdown } from "@/components/ui/Countdown";
import { DeliveryLine } from "@/components/ui/DeliveryLine";
import { PriceTag } from "@/components/ui/PriceTag";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { money } from "@/lib/format";

import { usePurchase } from "./PurchaseContext";

export function BuyBox() {
  const { product, color, edition, quantity, setQuantity, unitPrice, stock, withPlan, setWithPlan } = usePurchase();
  const { add } = useCart();
  const { notify } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [gift, setGift] = useState(false);
  const plan = product.protection_plan;
  const outOfStock = stock <= 0;
  const maxQty = Math.min(stock, 10);

  async function addToCart(): Promise<boolean> {
    const ok = await add(product.id, { variantId: color?.id, editionId: edition?.id, quantity, silent: true });
    if (ok && withPlan && plan) await add(plan.id, { quantity, silent: true });
    if (ok) {
      notify({
        kind: "success",
        message: `Added ${quantity} to cart${withPlan && plan ? " with protection plan" : ""}${gift ? ". Gift receipt noted." : ""}`,
        action: { label: "View cart", href: "/cart" },
      });
    }
    return ok;
  }

  return (
    <div className="space-y-4 rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-4">
      <PriceTag cents={unitPrice + (withPlan && plan ? plan.price_cents : 0)} size="lg" />
      <p className="text-sm text-ink-muted">Free returns within 30 days</p>

      <div className="rounded-control bg-surface-tint p-3">
        <DeliveryLine speed={product.delivery_speed} />
        {product.delivery_speed === "one_day" && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <Zap aria-hidden="true" className="size-3.5 text-primary" />
            Order within <CutoffCountdown className="font-bold text-deal" />
          </p>
        )}
      </div>

      <p className="flex items-center gap-2 text-sm">
        <MapPin aria-hidden="true" className="size-4 text-ink-muted" />
        {user ? `Deliver to ${user.name.split(" ")[0]}` : "Delivery address set at checkout"}
      </p>

      <p className={`text-base font-bold ${outOfStock ? "text-danger" : stock <= 10 ? "text-deal" : "text-ink"}`}>
        {outOfStock ? "Currently unavailable" : stock <= 10 ? `In Stock (only ${stock} left, order soon)` : "In Stock"}
      </p>

      {!outOfStock && (
        <label className="flex items-center justify-between gap-3 text-sm font-semibold">
          Quantity
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="h-11 w-24 rounded-control border border-line bg-surface-tint px-3 text-base font-bold"
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          disabled={outOfStock || busy !== null}
          loading={busy === "cart"}
          onClick={async () => {
            setBusy("cart");
            await addToCart();
            setBusy(null);
          }}
        >
          <ShoppingCart aria-hidden="true" className="size-5" />
          Add to Cart
        </Button>
        <Button
          size="lg"
          variant="dark"
          className="w-full"
          disabled={outOfStock || busy !== null}
          loading={busy === "buy"}
          onClick={async () => {
            setBusy("buy");
            if (await addToCart()) router.push("/checkout");
            else setBusy(null);
          }}
        >
          <Zap aria-hidden="true" className="size-5" />
          Buy Now
        </Button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-ink-muted">Ships from</dt>
        <dd className="text-right">Apex Logistics Hub</dd>
        <dt className="text-ink-muted">Sold by</dt>
        <dd className="text-right">
          <Link href={`/search?seller=${product.seller.slug}`} className="font-semibold text-accent-text hover:underline">
            {product.seller.name}
          </Link>
        </dd>
        <dt className="text-ink-muted">Returns</dt>
        <dd className="text-right">30-day refund or replacement</dd>
        <dt className="text-ink-muted">Payment</dt>
        <dd className="flex items-center justify-end gap-1">
          <Lock aria-hidden="true" className="size-3.5" /> Secure transaction
        </dd>
      </dl>

      {plan && !outOfStock && (
        <label className="flex cursor-pointer gap-3 rounded-control border border-line p-3 text-sm hover:bg-surface-tint">
          <input
            type="checkbox"
            checked={withPlan}
            onChange={(e) => setWithPlan(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <span className="font-bold">
              Add a 2-Year Protection Plan for {money(plan.price_cents)}
            </span>
            <span className="mt-0.5 block text-ink-muted">Covers drops, spills and mechanical failure.</span>
          </span>
        </label>
      )}
      {!outOfStock && (
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={gift}
            onChange={(e) => setGift(e.target.checked)}
            className="size-5 accent-[var(--color-primary)]"
          />
          Add a gift receipt for easy returns
        </label>
      )}
    </div>
  );
}
