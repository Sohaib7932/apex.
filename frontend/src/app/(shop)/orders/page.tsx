import { ChevronRight, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusPill } from "@/components/orders/OrderParts";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { apiGet } from "@/lib/api-server";
import { formatDate, money } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import type { OrderPage } from "@/types/api";

export const metadata: Metadata = { title: "Your Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  await requireUser("/orders");
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);
  const res = await apiGet<OrderPage>(`/orders?page=${page}`, { auth: true });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Your Orders</h1>
      <p className="mt-1 text-ink-muted">Track each item&apos;s shipping status, store by store.</p>

      <div className="mt-6">
        {!res.ok ? (
          <ErrorState title="We couldn't load your orders" message={res.message} />
        ) : res.data.items.length === 0 ? (
          <EmptyState
            icon={<Package aria-hidden="true" className="size-7" />}
            title="No orders yet"
            action={<ButtonLink href="/">Start shopping</ButtonLink>}
          >
            When you place an order, it shows up here with its delivery status.
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-4">
              {res.data.items.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="block rounded-card bg-surface shadow-card transition-shadow hover:shadow-pop"
                  >
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-t-card border-b border-line bg-surface-tint px-5 py-3 text-xs">
                      <div>
                        <p className="font-bold uppercase tracking-wide text-ink-muted">Order placed</p>
                        <p className="text-sm text-ink">{formatDate(o.created_at)}</p>
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-wide text-ink-muted">Total</p>
                        <p className="text-sm text-ink">{money(o.total_cents)}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="font-bold uppercase tracking-wide text-ink-muted">Order</p>
                        <p className="text-sm text-ink">{o.number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-5">
                      <div className="min-w-0 flex-1">
                        <StatusPill status={o.display_status} />
                        <p className="mt-2 text-sm text-ink-muted">
                          {o.item_count} {o.item_count === 1 ? "item" : "items"} from{" "}
                          {[...new Set(o.items.map((i) => i.seller_name))].join(", ")}
                        </p>
                        <ul className="mt-3 flex gap-2">
                          {o.items.slice(0, 5).map((i) => (
                            <li key={i.id}>
                              <ProductImage src={i.image} alt={i.title} sizes="64px" className="size-16 rounded-control" />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {res.data.pages > 1 && (
              <nav aria-label="Pagination" className="mt-6 flex justify-center gap-2">
                {Array.from({ length: res.data.pages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/orders?page=${p}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`grid size-11 place-items-center rounded-control text-sm font-bold ${
                      p === page ? "bg-chrome text-on-chrome" : "bg-surface shadow-card hover:bg-surface-tint"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
