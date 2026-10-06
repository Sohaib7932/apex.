import { AlertTriangle, ChevronRight, DollarSign, Package, ShoppingBag, Truck, Wallet } from "lucide-react";
import Link from "next/link";

import { formatDate, money } from "@/lib/format";
import type { Fulfillment, SellerOrderRow, SellerOverview } from "@/types/api";

function Stat({
  label,
  value,
  note,
  icon: Icon,
  href,
  warn,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof DollarSign;
  href?: string;
  warn?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-muted">{label}</p>
        <span className={`grid size-9 place-items-center rounded-pill ${warn ? "bg-deal-soft text-deal" : "bg-seller-soft text-seller"}`}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
        {note}
        {href && <ChevronRight aria-hidden="true" className="size-3.5" />}
      </p>
    </>
  );
  const cls = "block h-full rounded-card bg-surface p-5 shadow-card";
  return href ? (
    <Link href={href} className={`${cls} hover:ring-2 hover:ring-seller/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatCards({ data }: { data: SellerOverview }) {
  return (
    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <li>
        <Stat label="Revenue" value={money(data.revenue_cents)} note="Last 30 days" icon={DollarSign} />
      </li>
      <li>
        <Stat label="Orders" value={String(data.orders)} note="Last 30 days" icon={ShoppingBag} />
      </li>
      <li>
        <Stat label="Units sold" value={String(data.units)} note="Last 30 days" icon={Package} />
      </li>
      <li>
        <Stat
          label="Low stock"
          value={String(data.low_stock)}
          note="Published, 5 or fewer left"
          icon={AlertTriangle}
          href="/seller/products?status=low_stock"
          warn={data.low_stock > 0}
        />
      </li>
    </ul>
  );
}

export function EarningsCard({ data }: { data: SellerOverview }) {
  return (
    <section aria-labelledby="earnings-title" className="flex h-full flex-col rounded-card bg-seller p-5 text-on-seller shadow-card">
      <p id="earnings-title" className="flex items-center gap-2 text-sm font-semibold opacity-90">
        <Wallet aria-hidden="true" className="size-4" /> Earnings balance
      </p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{money(data.earnings_cents)}</p>
      <p className="mt-1 text-sm opacity-90">All paid, shipped and delivered orders</p>
      <p className="mt-auto pt-4 text-xs opacity-80">Display only: payouts aren&apos;t part of this demo.</p>
      {data.to_ship > 0 && (
        <Link
          href="/seller/orders?status=to_ship"
          className="mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-control bg-surface px-4 text-sm font-bold text-seller hover:bg-seller-soft"
        >
          <span className="flex items-center gap-2">
            <Truck aria-hidden="true" className="size-4" /> {data.to_ship} {data.to_ship === 1 ? "order" : "orders"} to ship
          </span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </section>
  );
}

const FULFILLMENT: Record<Fulfillment, { label: string; cls: string }> = {
  to_ship: { label: "To ship", cls: "bg-primary-soft text-accent-text" },
  shipped: { label: "Shipped", cls: "bg-seller-soft text-seller" },
  delivered: { label: "Delivered", cls: "bg-success-soft text-success" },
  cancelled: { label: "Cancelled", cls: "bg-deal-soft text-deal" },
};

export function FulfillmentPill({ value }: { value: Fulfillment }) {
  const f = FULFILLMENT[value];
  return <span className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-bold ${f.cls}`}>{f.label}</span>;
}

export function RecentOrders({ orders }: { orders: SellerOrderRow[] }) {
  return (
    <section aria-labelledby="recent-title" className="rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 id="recent-title" className="text-lg font-extrabold">
          Recent orders
        </h2>
        <Link href="/seller/orders" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-seller hover:underline">
          All orders <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="mt-3 rounded-control bg-surface-tint p-4 text-sm text-ink-muted">
          No orders yet. Once buyers order your products, they appear here.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/seller/orders?open=${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-surface-tint sm:flex-nowrap">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{o.number}</span>
                  <span className="text-xs text-ink-muted">
                    {formatDate(o.created_at)} · {o.buyer} · {o.units} {o.units === 1 ? "unit" : "units"}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums">{money(o.subtotal_cents)}</span>
                <FulfillmentPill value={o.fulfillment} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
