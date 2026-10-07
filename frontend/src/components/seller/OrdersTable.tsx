"use client";

import { ChevronDown, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate, money } from "@/lib/format";
import type { SellerOrderDetail, SellerOrderPage, SellerOrderRow } from "@/types/api";

import { FulfillmentPill } from "./OverviewParts";

function Detail({ order, onShipped }: { order: SellerOrderRow; onShipped: (d: SellerOrderDetail) => void }) {
  const { notify } = useToast();
  const [detail, setDetail] = useState<SellerOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<SellerOrderDetail>(`/seller/orders/${order.id}`)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  if (error) return <p className="p-4 text-sm text-danger">{error}</p>;
  if (!detail) return <Skeleton className="m-4 h-28" />;
  const a = detail.address;
  return (
    <div className="grid gap-4 bg-surface-tint/50 p-4 md:grid-cols-[1fr_16rem]">
      <ul className="space-y-3">
        {detail.lines.map((l) => (
          <li key={l.id} className="flex gap-3">
            <ProductImage src={l.image} alt="" sizes="56px" className="size-14 shrink-0 rounded-control" />
            <div className="min-w-0 flex-1 text-sm">
              <Link href={`/product/${l.product_slug}`} className="line-clamp-1 font-semibold hover:underline">
                {l.title}
              </Link>
              <p className="text-ink-muted">
                {l.variant_label ? `${l.variant_label} · ` : ""}Qty {l.quantity} · {money(l.unit_price_cents)} each
              </p>
              <p className={`text-xs font-bold ${l.fulfillment_status === "shipped" ? "text-accent-text" : "text-accent-text"}`}>
                {l.fulfillment_status === "shipped" ? `Shipped ${l.shipped_at ? formatDate(l.shipped_at) : ""}` : "Not shipped yet"}
              </p>
            </div>
            <p className="text-sm font-bold tabular-nums">{money(l.line_total_cents)}</p>
          </li>
        ))}
      </ul>
      <div className="space-y-3 text-sm">
        <p className="flex gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-text" />
          <span>
            <span className="font-semibold">{a.full_name}</span>
            <br />
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ""}
            <br />
            {a.city}, {a.state} {a.zip}
          </span>
        </p>
        <p className="text-ink-muted">{detail.delivery_method === "one_day" ? "One-Day delivery" : "Standard delivery"}</p>
        {detail.can_ship ? (
          <Button
            variant="primary"
            className="w-full"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const d = await api<SellerOrderDetail>(`/seller/orders/${order.id}/ship`, { method: "POST" });
                setDetail(d);
                onShipped(d);
                notify({ kind: "success", message: `${order.number} marked as shipped. The buyer can see it now.` });
              } catch (e) {
                notify({ kind: "error", message: errorMessage(e) });
              } finally {
                setBusy(false);
              }
            }}
          >
            <Truck aria-hidden="true" className="size-4" /> Mark as shipped
          </Button>
        ) : (
          <p className="rounded-control bg-surface p-3 text-xs text-ink-muted">
            {detail.status === "cancelled"
              ? "This order was cancelled."
              : detail.fulfillment === "to_ship"
                ? "Only paid orders can be shipped."
                : "Your items in this order are shipped."}
          </p>
        )}
      </div>
    </div>
  );
}

export function OrdersTable({ data, openId }: { data: SellerOrderPage; openId: number | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<number | null>(openId);
  const [rows, setRows] = useState(data.items);

  if (rows.length === 0) {
    return (
      <div className="rounded-card bg-surface p-10 text-center shadow-card">
        <p className="text-lg font-bold">No orders here</p>
        <p className="mt-1 text-sm text-ink-muted">Orders that include your products show up in this list.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.6fr_1fr_1fr_2.5rem] gap-3 bg-surface-tint px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-muted md:grid">
        <span>Order</span>
        <span>Date</span>
        <span>Buyer</span>
        <span className="text-right">Items</span>
        <span className="text-right">Your subtotal</span>
        <span>Status</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {rows.map((o) => {
          const expanded = open === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`order-${o.id}`}
                onClick={() => setOpen(expanded ? null : o.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left text-sm hover:bg-surface-tint md:grid-cols-[1.2fr_1fr_1fr_0.6fr_1fr_1fr_2.5rem]"
              >
                <span className="font-bold">{o.number}</span>
                <span className="text-ink-muted md:text-ink">{formatDate(o.created_at)}</span>
                <span className="text-ink-muted md:text-ink">{o.buyer}</span>
                <span className="text-ink-muted md:text-right md:text-ink">
                  {o.units} <span className="md:hidden">{o.units === 1 ? "unit" : "units"}</span>
                </span>
                <span className="font-semibold tabular-nums md:text-right">{money(o.subtotal_cents)}</span>
                <span>
                  <FulfillmentPill value={o.fulfillment} />
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`hidden size-5 text-ink-muted transition-transform md:block ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded && (
                <div id={`order-${o.id}`}>
                  <Detail
                    order={o}
                    onShipped={(d) => {
                      setRows((all) => all.map((r) => (r.id === o.id ? { ...r, fulfillment: d.fulfillment } : r)));
                      startTransition(() => router.refresh());
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
