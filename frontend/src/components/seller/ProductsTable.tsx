"use client";

import { Eye, EyeOff, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate, money } from "@/lib/format";
import type { SellerProductPage, SellerProductRow } from "@/types/api";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "low_stock", label: "Low stock" },
] as const;

function StatusPill({ row }: { row: SellerProductRow }) {
  return row.status === "published" ? (
    <span className="inline-flex rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-bold text-accent-text">Published</span>
  ) : (
    <span className="inline-flex rounded-pill bg-surface-tint-2 px-2.5 py-1 text-xs font-bold text-ink-muted">Draft</span>
  );
}

function Stock({ row }: { row: SellerProductRow }) {
  return (
    <span className={row.low_stock || row.stock === 0 ? "font-bold text-deal" : ""}>
      {row.stock}
      {row.low_stock && <span className="ml-1 text-xs font-semibold">(low)</span>}
    </span>
  );
}

export function ProductsTable({ data, q, status }: { data: SellerProductPage; q: string; status: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<SellerProductRow | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const go = (params: { q?: string; status?: string; page?: number }) => {
    const p = new URLSearchParams();
    const nextQ = params.q ?? q;
    const nextStatus = params.status ?? status;
    if (nextQ) p.set("q", nextQ);
    if (nextStatus !== "all") p.set("status", nextStatus);
    if (params.page && params.page > 1) p.set("page", String(params.page));
    startTransition(() => router.push(`/seller/products${p.size ? `?${p}` : ""}`));
  };

  async function act(row: SellerProductRow, action: "publish" | "unpublish" | "delete") {
    setBusyId(row.id);
    try {
      if (action === "delete") {
        const res = await api<{ result: string }>(`/seller/products/${row.id}`, { method: "DELETE" });
        notify({
          kind: "success",
          message: res.result === "archived" ? "Archived: it's in past orders, so order history is kept." : "Product deleted.",
        });
      } else {
        await api(`/seller/products/${row.id}/${action}`, { method: "POST" });
        notify({ kind: "success", message: action === "publish" ? "Published. It's live in the store." : "Unpublished. It's now a draft." });
      }
      startTransition(() => router.refresh());
    } catch (e) {
      notify({ kind: "error", message: errorMessage(e) });
    } finally {
      setBusyId(null);
    }
  }

  const actions = (row: SellerProductRow) => (
    <div className="flex flex-wrap items-center gap-1">
      <Link
        href={`/seller/products/${row.id}`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-accent-text hover:bg-primary-soft sm:min-h-9"
      >
        <Pencil aria-hidden="true" className="size-4" /> Edit
      </Link>
      <Button
        variant="ghost"
        size="sm"
        loading={busyId === row.id}
        onClick={() => act(row, row.status === "published" ? "unpublish" : "publish")}
      >
        {row.status === "published" ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        {row.status === "published" ? "Unpublish" : "Publish"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-danger"
        aria-label={`Delete ${row.title}`}
        onClick={() => {
          setConfirming(row);
          dialog.current?.showModal();
        }}
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Filter products" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = data.counts[f.value];
            const active = status === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go({ status: f.value, page: 1 })}
                className={`inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold ${
                  active ? "bg-chrome text-on-chrome" : "bg-surface text-ink shadow-card hover:bg-surface-tint"
                }`}
              >
                {f.label}
                <span className={`text-xs tabular-nums ${active ? "text-on-chrome-muted" : "text-ink-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: query.trim(), page: 1 });
          }}
          className="relative md:w-72"
        >
          <label htmlFor="product-search" className="sr-only">
            Search your products
          </label>
          <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="product-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title"
            className="h-11 w-full rounded-control border border-line bg-surface pr-3 pl-9 text-base outline-none focus:border-primary sm:text-sm"
          />
        </form>
      </div>

      <div className={`transition-opacity ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
        {data.items.length === 0 ? (
          <div className="rounded-card bg-surface p-10 text-center shadow-card">
            <p className="text-lg font-bold">{q || status !== "all" ? "No products match" : "No products yet"}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {q || status !== "all" ? "Try another filter or search." : "Add your first product to start selling."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-card bg-surface shadow-card md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-tint text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">Product</th>
                    <th scope="col" className="px-4 py-3 text-right">Price</th>
                    <th scope="col" className="px-4 py-3 text-right">Stock</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Updated</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage src={row.image} alt="" sizes="48px" className="size-12 shrink-0 rounded-control" />
                          <Link href={`/seller/products/${row.id}`} className="line-clamp-2 font-semibold hover:underline">
                            {row.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.price_cents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <Stock row={row} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill row={row} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{formatDate(row.updated_at)}</td>
                      <td className="px-4 py-3">{actions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {data.items.map((row) => (
                <li key={row.id} className="rounded-card bg-surface p-4 shadow-card">
                  <div className="flex gap-3">
                    <ProductImage src={row.image} alt="" sizes="64px" className="size-16 shrink-0 rounded-control" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold">{row.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-bold">{money(row.price_cents)}</span>
                        <span className="text-ink-muted">
                          Stock <Stock row={row} />
                        </span>
                        <StatusPill row={row} />
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-line pt-2">{actions(row)}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {data.pages > 1 && (
        <nav aria-label="Pagination" className="flex justify-center gap-2">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go({ page: p })}
              aria-current={p === data.page ? "page" : undefined}
              className={`grid size-11 place-items-center rounded-control text-sm font-bold ${
                p === data.page ? "bg-chrome text-on-chrome" : "bg-surface shadow-card hover:bg-surface-tint"
              }`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        onClose={() => setConfirming(null)}
        className="m-auto w-[min(28rem,92vw)] rounded-card bg-surface p-6 text-ink shadow-pop backdrop:bg-black/50"
      >
        <h2 id="delete-title" className="text-lg font-extrabold">
          Delete this product?
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">{confirming?.title}</span> will be removed from the store. If it
          appears in past orders it&apos;s archived instead, so buyers keep their order history.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              const row = confirming;
              dialog.current?.close();
              if (row) void act(row, "delete");
            }}
          >
            Delete
          </Button>
        </div>
      </dialog>
    </div>
  );
}
