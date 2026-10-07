"use client";

import { Check, CircleAlert, Lock, MapPin, ShoppingCart, Truck, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { useCart } from "@/context/CartContext";
import { useNow } from "@/hooks/useNow";
import { api, errorMessage } from "@/lib/api-client";
import { addDays, formatDay, money } from "@/lib/format";
import { US_STATES } from "@/lib/us-states";
import type { Address, Cart } from "@/types/api";

type Errors = Partial<Record<keyof Address, string>>;
type Delivery = "standard" | "one_day";

function validate(a: Address): Errors {
  const e: Errors = {};
  if (a.full_name.trim().length < 2) e.full_name = "Enter the recipient's full name.";
  if (a.line1.trim().length < 3) e.line1 = "Enter a street address.";
  if (a.city.trim().length < 2) e.city = "Enter a city.";
  if (!a.state) e.state = "Choose a state.";
  if (!/^\d{5}(-\d{4})?$/.test(a.zip.trim())) e.zip = "Enter a 5-digit ZIP code.";
  if (!/^[0-9+()\-.\s]{7,30}$/.test(a.phone.trim())) e.phone = "Enter a phone number we can call about delivery.";
  return e;
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      <h2 id={`step-${n}`} className="flex items-center gap-3 text-xl font-extrabold">
        <span
          className={`grid size-8 place-items-center rounded-pill text-sm ${done ? "bg-chrome text-white" : "bg-chrome text-on-chrome"}`}
        >
          {done ? <Check aria-hidden="true" className="size-4" /> : n}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  className = "",
  children,
  id,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const input = (bad: boolean) =>
  `block h-12 w-full rounded-control border bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 ${
    bad ? "border-danger" : "border-line"
  }`;

export function CheckoutView({ initialAddress }: { initialAddress: Address }) {
  const { cart, loading, promoCode } = useCart();
  const uid = useId();
  const now = useNow(60_000);
  const [address, setAddress] = useState<Address>(initialAddress);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [delivery, setDelivery] = useState<Delivery>("standard");
  const [preview, setPreview] = useState<{ key: string; cart: Cart } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // Server totals for the chosen delivery method (and the current cart contents).
  const previewKey = `${delivery}|${promoCode ?? ""}|${cart?.summary.total_cents ?? 0}|${cart?.items.length ?? 0}`;
  useEffect(() => {
    if (!cart) return;
    let cancelled = false;
    const q = new URLSearchParams({ delivery });
    if (promoCode) q.set("promo", promoCode);
    api<Cart>(`/cart?${q}`)
      .then((c) => !cancelled && setPreview({ key: previewKey, cart: c }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [previewKey, delivery, promoCode, cart]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading checkout" className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  const selected = cart?.items.filter((l) => l.selected) ?? [];
  if (!cart || selected.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart aria-hidden="true" className="size-7" />}
        title="There's nothing to check out yet"
        action={<ButtonLink href="/cart">Go to your cart</ButtonLink>}
      >
        Select at least one item in your cart, then come back here.
      </EmptyState>
    );
  }

  const live = preview?.key === previewKey ? preview.cart : null;
  const summary = live?.summary ?? cart.summary;
  const shippingFree = summary.subtotal_cents >= summary.free_shipping_threshold_cents;
  const set = (k: keyof Address) => (e: { target: { value: string } }) => setAddress((a) => ({ ...a, [k]: e.target.value }));
  const describedBy = (k: keyof Address) => (errors[k] ? `${uid}-${k}-error` : undefined);
  const dateFor = (days: number) => (now === null ? "" : formatDay(addDays(new Date(now), days)));

  function confirmAddress(e: FormEvent) {
    e.preventDefault();
    const found = validate(address);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${uid}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setConfirmed(true);
  }

  async function pay() {
    setPaying(true);
    setPayError(null);
    try {
      const res = await api<{ order_id: number; url: string }>("/checkout/session", {
        method: "POST",
        body: {
          address: { ...address, line2: address.line2 || null },
          delivery_method: delivery,
          promo_code: promoCode,
          save_address: saveAddress,
        },
      });
      window.location.assign(res.url);
    } catch (e) {
      setPayError(errorMessage(e));
      setPaying(false);
    }
  }

  const deliveryOption = (value: Delivery, title: string, price: string, days: number, icon: ReactNode) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-control border-2 p-4 ${
        delivery === value ? "border-primary bg-primary-soft/40" : "border-line hover:bg-surface-tint"
      }`}
    >
      <input
        type="radio"
        name="delivery"
        value={value}
        checked={delivery === value}
        onChange={() => setDelivery(value)}
        className="mt-1 size-5 accent-[var(--color-primary)]"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-bold">
          {icon} {title}
        </span>
        <span className="block text-sm text-ink-muted">Arrives {dateFor(days) || "soon"}</span>
      </span>
      <span className="font-bold">{price}</span>
    </label>
  );

  return (
    <div className="grid items-start gap-6 pb-10 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Step n={1} title="Shipping address" done={confirmed}>
          {confirmed ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="flex gap-2 text-sm">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-text" />
                <span>
                  <span className="font-bold">{address.full_name}</span>
                  <br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.zip}
                  <br />
                  {address.phone}
                </span>
              </p>
              <Button variant="outline" size="sm" onClick={() => setConfirmed(false)}>
                Change
              </Button>
            </div>
          ) : (
            <form onSubmit={confirmAddress} noValidate className="grid gap-4 sm:grid-cols-6">
              <Field id={`${uid}-full_name`} label="Full name" error={errors.full_name} className="sm:col-span-6">
                <input id={`${uid}-full_name`} autoComplete="name" value={address.full_name} onChange={set("full_name")} aria-invalid={!!errors.full_name} aria-describedby={describedBy("full_name")} className={input(!!errors.full_name)} />
              </Field>
              <Field id={`${uid}-line1`} label="Street address" error={errors.line1} className="sm:col-span-6">
                <input id={`${uid}-line1`} autoComplete="address-line1" value={address.line1} onChange={set("line1")} aria-invalid={!!errors.line1} aria-describedby={describedBy("line1")} className={input(!!errors.line1)} />
              </Field>
              <Field id={`${uid}-line2`} label="Apartment, suite (optional)" className="sm:col-span-6">
                <input id={`${uid}-line2`} autoComplete="address-line2" value={address.line2 ?? ""} onChange={set("line2")} className={input(false)} />
              </Field>
              <Field id={`${uid}-city`} label="City" error={errors.city} className="sm:col-span-3">
                <input id={`${uid}-city`} autoComplete="address-level2" value={address.city} onChange={set("city")} aria-invalid={!!errors.city} aria-describedby={describedBy("city")} className={input(!!errors.city)} />
              </Field>
              <Field id={`${uid}-state`} label="State" error={errors.state} className="sm:col-span-2">
                <select id={`${uid}-state`} autoComplete="address-level1" value={address.state} onChange={set("state")} aria-invalid={!!errors.state} aria-describedby={describedBy("state")} className={input(!!errors.state)}>
                  <option value="">Choose</option>
                  {US_STATES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={`${uid}-zip`} label="ZIP code" error={errors.zip} className="sm:col-span-1">
                <input id={`${uid}-zip`} inputMode="numeric" autoComplete="postal-code" value={address.zip} onChange={set("zip")} aria-invalid={!!errors.zip} aria-describedby={describedBy("zip")} className={input(!!errors.zip)} />
              </Field>
              <Field id={`${uid}-phone`} label="Phone number" error={errors.phone} className="sm:col-span-3">
                <input id={`${uid}-phone`} type="tel" autoComplete="tel" value={address.phone} onChange={set("phone")} aria-invalid={!!errors.phone} aria-describedby={describedBy("phone")} className={input(!!errors.phone)} />
              </Field>
              <label className="flex items-center gap-3 text-sm sm:col-span-6">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
                Save as my default address
              </label>
              <div className="sm:col-span-6">
                <Button type="submit" size="lg">
                  Use this address
                </Button>
              </div>
            </form>
          )}
        </Step>

        <Step n={2} title="Review items and delivery">
          {!confirmed ? (
            <p className="text-sm text-ink-muted">Confirm your shipping address to continue.</p>
          ) : (
            <div className="space-y-5">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-bold">Delivery method</legend>
                {deliveryOption(
                  "standard",
                  "Standard delivery",
                  shippingFree ? "FREE" : money(599),
                  4,
                  <Truck aria-hidden="true" className="size-4" />,
                )}
                {deliveryOption("one_day", "One-Day delivery", money(999), 1, <Zap aria-hidden="true" className="size-4 text-primary" />)}
              </fieldset>
              <ul className="divide-y divide-line rounded-card border border-line">
                {selected.map((l) => (
                  <li key={l.key} className="flex gap-3 p-3">
                    <ProductImage src={l.image} alt="" sizes="64px" className="size-16 shrink-0 rounded-control" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="line-clamp-2 font-semibold">{l.title}</p>
                      <p className="text-ink-muted">
                        {l.variant_label ? `${l.variant_label} · ` : ""}Qty {l.quantity} · Sold by {l.seller_name}
                      </p>
                    </div>
                    <p className="text-sm font-bold">{money(l.line_total_cents)}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-muted">
                Want to change something?{" "}
                <Link href="/cart" className="font-semibold text-accent-text hover:underline">
                  Edit your cart
                </Link>
              </p>
            </div>
          )}
        </Step>
      </div>

      <aside className="space-y-4 rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-4">
        <h2 className="text-xl font-extrabold">Order summary</h2>
        <dl className={`space-y-2 text-sm ${live ? "" : "opacity-60"}`} aria-busy={!live}>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Items ({summary.item_count})</dt>
            <dd>{money(summary.subtotal_cents)}</dd>
          </div>
          {summary.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Promo ({promoCode})</dt>
              <dd className="font-semibold text-accent-text">-{money(summary.discount_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-muted">{delivery === "one_day" ? "One-Day delivery" : "Delivery"}</dt>
            <dd>{summary.shipping_cents ? money(summary.shipping_cents) : "FREE"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Estimated tax (8%)</dt>
            <dd>{money(summary.tax_cents)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3 text-base font-bold">
            <dt>Order total</dt>
            <dd className="text-2xl font-extrabold">{money(summary.total_cents)}</dd>
          </div>
        </dl>
        {payError && (
          <p role="alert" className="rounded-control bg-deal-soft p-3 text-sm font-semibold text-deal">
            {payError}
          </p>
        )}
        <Button size="lg" className="w-full" disabled={!confirmed || !live} loading={paying} onClick={pay}>
          <Lock aria-hidden="true" className="size-4" />
          Place order and pay
        </Button>
        <p className="text-xs text-ink-muted">
          {confirmed
            ? "You'll pay on Stripe's secure page. In test mode, use card 4242 4242 4242 4242, any future date and any CVC."
            : "Confirm your address to place the order."}
        </p>
      </aside>
    </div>
  );
}
