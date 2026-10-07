import { CircleCheck, Clock, MapPin, PackageCheck, Truck, XCircle } from "lucide-react";
import Link from "next/link";

import { ProductImage } from "@/components/ui/ProductImage";
import { formatDate, money } from "@/lib/format";
import type { Order } from "@/types/api";

const STATUS_STYLE: Record<string, string> = {
  "Awaiting payment": "bg-surface-tint-2 text-ink",
  Preparing: "bg-primary-soft text-accent-text",
  "Partially shipped": "bg-primary-soft text-accent-text",
  Shipped: "bg-surface-tint-3 text-ink",
  Delivered: "bg-chrome text-on-chrome",
  Cancelled: "bg-deal-soft text-deal",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-bold ${STATUS_STYLE[status] ?? "bg-surface-tint-2"}`}>
      {status}
    </span>
  );
}

function ItemStatus({ item, orderStatus }: { item: Order["items"][number]; orderStatus: Order["status"] }) {
  if (orderStatus === "cancelled") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-deal">
        <XCircle aria-hidden="true" className="size-4" /> Cancelled
      </span>
    );
  }
  if (orderStatus === "delivered") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <PackageCheck aria-hidden="true" className="size-4" /> Delivered
      </span>
    );
  }
  if (item.fulfillment_status === "shipped") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Truck aria-hidden="true" className="size-4 text-accent-text" /> Shipped by {item.seller_name}
        {item.shipped_at && <span className="font-normal text-ink-muted"> on {formatDate(item.shipped_at)}</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
      <Clock aria-hidden="true" className="size-4" /> Preparing at {item.seller_name}
    </span>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  const row = (label: string, value: string, cls = "") => (
    <div className={`flex justify-between gap-4 ${cls}`}>
      <dt className="text-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
  return (
    <dl className="space-y-1.5 text-sm">
      {row(`Items (${order.item_count})`, money(order.subtotal_cents))}
      {order.discount_cents > 0 && row(`Promo (${order.promo_code})`, `-${money(order.discount_cents)}`)}
      {row(order.delivery_method === "one_day" ? "One-Day delivery" : "Delivery", order.shipping_cents ? money(order.shipping_cents) : "FREE")}
      {row("Tax (8%)", money(order.tax_cents))}
      <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-bold">
        <dt>Order total</dt>
        <dd>{money(order.total_cents)}</dd>
      </div>
    </dl>
  );
}

/** Full order view: items with per-store shipping status, address and totals. */
export function OrderDetailView({ order }: { order: Order }) {
  const a = order.address;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <section aria-label="Items" className="rounded-card bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <p className="text-sm text-ink-muted">Order {order.number}</p>
            <p className="text-sm text-ink-muted">Placed {formatDate(order.created_at)}</p>
          </div>
          <StatusPill status={order.display_status} />
        </div>
        {order.status !== "cancelled" && order.status !== "pending" && (
          <p className="mt-4 flex items-center gap-2 text-base font-bold">
            <CircleCheck aria-hidden="true" className="size-5 text-accent-text" />
            {order.status === "delivered" ? "Delivered" : `Estimated delivery: ${formatDate(order.estimated_delivery)}`}
          </p>
        )}
        <ul className="mt-2 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <Link href={`/product/${item.product_slug}`} className="shrink-0">
                <ProductImage src={item.image} alt="" sizes="80px" className="size-20 rounded-control" />
              </Link>
              <div className="min-w-0 flex-1 space-y-1">
                <Link href={`/product/${item.product_slug}`} className="font-semibold break-words hover:underline">
                  {item.title}
                </Link>
                <p className="text-sm text-ink-muted">
                  {item.variant_label ? `${item.variant_label} · ` : ""}Qty {item.quantity} · {money(item.unit_price_cents)} each
                </p>
                <ItemStatus item={item} orderStatus={order.status} />
              </div>
              <p className="text-sm font-bold">{money(item.line_total_cents)}</p>
            </li>
          ))}
        </ul>
      </section>
      <aside className="space-y-4">
        <section className="rounded-card bg-surface p-5 text-sm shadow-card">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <MapPin aria-hidden="true" className="size-4 text-accent-text" /> Shipping address
          </h2>
          <p className="mt-2 text-ink-muted">
            <span className="font-semibold text-ink">{a.full_name}</span>
            <br />
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ""}
            <br />
            {a.city}, {a.state} {a.zip}
            <br />
            {a.phone}
          </p>
        </section>
        <section className="rounded-card bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-base font-bold">Payment summary</h2>
          <OrderTotals order={order} />
        </section>
      </aside>
    </div>
  );
}
