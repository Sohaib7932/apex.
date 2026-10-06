"use client";

import { Lock, ShieldCheck, Tag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { Button, buttonClass } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { money } from "@/lib/format";
import type { Cart } from "@/types/api";

function PromoCode() {
  const { cart, applyPromo, removePromo, promoCode } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const promo = cart?.promo;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await applyPromo(code);
    setBusy(false);
    setError(err);
    if (!err) setCode("");
  }

  if (promo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-control bg-success-soft px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-success">
          <Tag aria-hidden="true" className="size-4" /> {promo.code} applied ({promo.percent_off}% off)
        </span>
        <button
          type="button"
          onClick={() => removePromo()}
          aria-label={`Remove promo code ${promo.code}`}
          className="grid size-9 place-items-center rounded-control hover:bg-surface"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="promo" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-muted">
        Gift card or promo code
      </label>
      <div className="flex gap-2">
        <input
          id="promo"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. APEX10"
          autoCapitalize="characters"
          aria-invalid={!!error}
          aria-describedby={error ? "promo-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-control border border-line bg-surface-tint px-3 text-base uppercase outline-none focus:border-primary sm:text-sm"
        />
        <Button type="submit" variant="dark" loading={busy}>
          Apply
        </Button>
      </div>
      {(error || (promoCode && cart?.promo_error)) && (
        <p id="promo-error" role="alert" className="mt-1.5 text-sm font-semibold text-danger">
          {error ?? cart?.promo_error}
        </p>
      )}
    </form>
  );
}

function Row({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-base font-bold" : "text-sm"}`}>
      <dt className={strong ? "" : "text-ink-muted"}>{label}</dt>
      <dd className={tone}>{value}</dd>
    </div>
  );
}

export function blockingReason(cart: Cart): string | null {
  const selected = cart.items.filter((l) => l.selected);
  if (!selected.length) return "Select at least one item to check out.";
  if (selected.some((l) => !l.in_stock)) return "Some items don't have enough stock. Lower the quantity or remove them.";
  return null;
}

export function OrderSummary({ cart }: { cart: Cart }) {
  const { syncing } = useCart();
  const s = cart.summary;
  const blocked = blockingReason(cart);
  return (
    <section aria-labelledby="summary-title" className="space-y-4 rounded-card bg-surface p-5 shadow-card">
      <h2 id="summary-title" className="text-xl font-extrabold">
        Order Summary
      </h2>
      <dl className={`space-y-2 transition-opacity ${syncing ? "opacity-60" : ""}`} aria-busy={syncing}>
        <Row label={`Items (${s.item_count})`} value={money(s.subtotal_cents)} />
        {s.discount_cents > 0 && (
          <Row label={`Promo (${cart.promo?.code})`} value={`-${money(s.discount_cents)}`} tone="text-success font-semibold" />
        )}
        <Row
          label="Estimated delivery"
          value={s.shipping_cents === 0 ? (s.item_count ? "FREE" : money(0)) : money(s.shipping_cents)}
          tone={s.shipping_cents === 0 && s.item_count ? "font-semibold text-success" : undefined}
        />
        <Row label="Estimated tax (8%)" value={money(s.tax_cents)} />
        <div className="border-t border-line pt-3">
          <div className="flex items-baseline justify-between rounded-control bg-surface-tint p-3">
            <dt className="text-base font-bold">Order total</dt>
            <dd className="text-2xl font-extrabold">{money(s.total_cents)}</dd>
          </div>
        </div>
      </dl>
      {blocked ? (
        <p className="rounded-control bg-deal-soft p-3 text-sm font-semibold text-deal">{blocked}</p>
      ) : null}
      <Link
        href="/checkout"
        aria-disabled={!!blocked}
        className={`${buttonClass("primary", "lg", "w-full")} ${blocked ? "pointer-events-none opacity-50" : ""}`}
      >
        <Lock aria-hidden="true" className="size-4" />
        Proceed to Checkout ({s.item_count} {s.item_count === 1 ? "item" : "items"})
      </Link>
      <PromoCode />
      <p className="flex gap-2 rounded-control bg-surface-tint p-3 text-xs text-ink-muted">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
        Apex A-to-z Guarantee: protection on condition, authenticity and on-time delivery for every order.
      </p>
    </section>
  );
}

/** Mobile: total and checkout button stay on screen while you scroll the cart. */
export function MobileCheckoutBar({ cart }: { cart: Cart }) {
  const blocked = blockingReason(cart);
  // Keep the footer reachable above the fixed bar.
  useEffect(() => {
    document.body.classList.add("max-lg:pb-24");
    return () => document.body.classList.remove("max-lg:pb-24");
  }, []);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">Total ({cart.summary.item_count} items)</p>
          <p className="text-xl font-extrabold">{money(cart.summary.total_cents)}</p>
        </div>
        <Link
          href="/checkout"
          aria-disabled={!!blocked}
          className={`${buttonClass("primary", "lg")} ${blocked ? "pointer-events-none opacity-50" : ""}`}
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
