"use client";

import { CircleCheck, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { OrderDetailView } from "@/components/orders/OrderParts";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { useCart } from "@/context/CartContext";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { Order } from "@/types/api";

const MAX_TRIES = 15;

/**
 * Stripe sends the buyer here after paying. The API checks the payment with Stripe
 * (never trusting this redirect) and the webhook does the same; we poll briefly
 * until the order shows as paid.
 */
export function Confirmation({ orderId }: { orderId: number }) {
  const { refresh } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const refreshed = useRef(false);

  useEffect(() => {
    if (order && order.status !== "pending") {
      if (!refreshed.current) {
        refreshed.current = true;
        void refresh(); // purchased items left the cart
      }
      return;
    }
    if (tries >= MAX_TRIES) return;
    const t = setTimeout(
      async () => {
        try {
          setOrder(await api<Order>("/checkout/confirm", { method: "POST", body: { order_id: orderId } }));
        } catch (e) {
          setError(errorMessage(e));
        }
        setTries((n) => n + 1);
      },
      tries === 0 ? 0 : 2500,
    );
    return () => clearTimeout(t);
  }, [order, tries, orderId, refresh]);

  if (error && !order) return <ErrorState title="We couldn't load your order" message={error} />;

  if (!order || order.status === "pending") {
    const gaveUp = tries >= MAX_TRIES;
    return (
      <div role="status" className="flex flex-col items-center rounded-card bg-surface px-6 py-16 text-center shadow-card">
        {!gaveUp && <Loader2 aria-hidden="true" className="size-10 animate-spin text-primary" />}
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{gaveUp ? "Payment still processing" : "Confirming your payment…"}</h1>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          {gaveUp
            ? "Stripe hasn't confirmed this payment yet. You won't be charged twice. Check Your Orders in a minute."
            : "This usually takes a few seconds. Please don't close this page."}
        </p>
        {gaveUp && (
          <ButtonLink href="/orders" className="mt-6">
            Go to Your Orders
          </ButtonLink>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-card bg-surface p-6 shadow-card sm:flex-row sm:items-center">
        <span className="grid size-14 shrink-0 place-items-center rounded-pill bg-primary-soft text-accent-text">
          <CircleCheck aria-hidden="true" className="size-8" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Thank you, your order is placed</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Order <span className="font-bold text-ink">{order.number}</span>. Estimated delivery{" "}
            <span className="font-bold text-ink">{formatDate(order.estimated_delivery)}</span>. We&apos;ll show each
            item&apos;s shipping status in Your Orders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/orders/${order.id}`} variant="dark">
            View order
          </ButtonLink>
          <ButtonLink href="/" variant="outline">
            Keep shopping
          </ButtonLink>
        </div>
      </section>
      <OrderDetailView order={order} />
    </div>
  );
}
