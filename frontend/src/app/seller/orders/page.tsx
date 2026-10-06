import type { Metadata } from "next";
import Link from "next/link";

import { OrdersTable } from "@/components/seller/OrdersTable";
import { OrderStatusFilter } from "@/components/seller/OrderStatusFilter";
import { SellerPageHeader } from "@/components/seller/SellerShell";
import { ErrorState } from "@/components/ui/States";
import { apiGet, toQuery } from "@/lib/api-server";
import { requireSeller } from "@/lib/guards";
import type { SellerOrderPage } from "@/types/api";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = ["all", "to_ship", "shipped", "cancelled"];

export default async function SellerOrdersPage({ searchParams }: PageProps<"/seller/orders">) {
  await requireSeller("/seller/orders");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && FILTERS.includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const openId = Number.parseInt(String(sp.open ?? ""), 10);
  const res = await apiGet<SellerOrderPage>(`/seller/orders${toQuery({ status, page })}`, { auth: true });

  return (
    <>
      <SellerPageHeader title="Orders" subtitle="Only your items and your share of each order are shown." />
      <div className="space-y-4">
        <OrderStatusFilter active={status} />
        {res.ok ? (
          <>
            <OrdersTable key={`${status}|${page}`} data={res.data} openId={Number.isFinite(openId) ? openId : null} />
            {res.data.pages > 1 && (
              <nav aria-label="Pagination" className="flex justify-center gap-2">
                {Array.from({ length: res.data.pages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/seller/orders${toQuery({ status: status === "all" ? "" : status, page: p > 1 ? p : "" })}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`grid size-11 place-items-center rounded-control text-sm font-bold ${
                      p === page ? "bg-seller text-on-seller" : "bg-surface shadow-card hover:bg-seller-soft"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </nav>
            )}
          </>
        ) : (
          <ErrorState title="Your orders didn't load" message={res.message} />
        )}
      </div>
    </>
  );
}
