"use client";

import { CircleAlert, ShoppingCart } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/format";

import { CartItem, SavedItem } from "./CartItem";
import { CartRecommendations } from "./CartRecommendations";
import { FreeDeliveryProgress } from "./FreeDeliveryProgress";
import { MobileCheckoutBar, OrderSummary } from "./OrderSummary";

function CartSkeleton() {
  return (
    <div role="status" aria-label="Loading your cart" className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}

export function CartView({ cancelled }: { cancelled: boolean }) {
  const { cart, loading, failed, selectAll, moveAllSaved, refresh } = useCart();

  if (loading) return <CartSkeleton />;
  if (failed || !cart) return <ErrorState title="We couldn't load your cart" onRetry={() => void refresh()} />;

  const allSelected = cart.items.length > 0 && cart.items.every((l) => l.selected);
  const units = cart.items.reduce((n, l) => n + l.quantity, 0);
  const ids = [...cart.items, ...cart.saved].map((l) => l.product_id);

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {cancelled && (
        <div role="status" className="flex items-start gap-3 rounded-card border border-primary bg-primary-soft p-4 text-sm">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-text" />
          <p>
            <span className="font-bold">Checkout was cancelled.</span> You weren&apos;t charged, and your cart is
            just as you left it.
          </p>
        </div>
      )}

      {cart.items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart aria-hidden="true" className="size-7" />}
          title="Your Apex Cart is empty"
          action={<ButtonLink href="/search?deals=today">Shop today&apos;s deals</ButtonLink>}
        >
          {cart.saved.length
            ? "You have items saved for later below. Move them back when you're ready."
            : "Browse the store and add something you love. Your cart is saved on this device."}
        </EmptyState>
      ) : (
        <>
          <FreeDeliveryProgress summary={cart.summary} />
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
            <section aria-labelledby="cart-title" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h1 id="cart-title" className="text-3xl font-extrabold tracking-tight">
                    Shopping Cart
                  </h1>
                  <button
                    type="button"
                    onClick={() => selectAll(!allSelected)}
                    className="min-h-10 text-sm font-semibold text-accent-text hover:underline"
                  >
                    {allSelected ? "Deselect all items" : "Select all items"}
                  </button>
                  <span className="ml-2 text-sm text-ink-muted">
                    {cart.items.length} {cart.items.length === 1 ? "product" : "products"} ({units} units)
                  </span>
                </div>
                <span className="hidden text-xs font-bold uppercase tracking-wide text-ink-muted sm:block">Price</span>
              </div>
              <ul className="divide-y divide-line">
                {cart.items.map((line) => (
                  <li key={line.key}>
                    <CartItem line={line} />
                  </li>
                ))}
              </ul>
              <p className="border-t border-line pt-4 text-right text-lg">
                Subtotal ({cart.summary.item_count} {cart.summary.item_count === 1 ? "item" : "items"}):{" "}
                <span className="text-2xl font-extrabold">{money(cart.summary.subtotal_cents)}</span>
              </p>
            </section>
            <div className="lg:sticky lg:top-4">
              <OrderSummary cart={cart} />
            </div>
          </div>
          <MobileCheckoutBar cart={cart} />
        </>
      )}

      {cart.saved.length > 0 && (
        <section aria-labelledby="saved-title" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="saved-title" className="text-xl font-extrabold">
                Saved for Later
              </h2>
              <p className="text-sm text-ink-muted">
                {cart.saved.length} {cart.saved.length === 1 ? "item" : "items"} set aside
              </p>
            </div>
            <button
              type="button"
              onClick={() => moveAllSaved()}
              className="min-h-11 rounded-control px-3 text-sm font-bold text-accent-text hover:bg-surface-tint"
            >
              Move all to cart
            </button>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {cart.saved.map((line) => (
              <li key={line.key}>
                <SavedItem line={line} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CartRecommendations productIds={ids} />
    </div>
  );
}
