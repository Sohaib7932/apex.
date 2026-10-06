import { discountPct, money, priceParts } from "@/lib/format";

/** "$119.99" with small cents, an optional struck-through list price and discount. */
export function PriceTag({
  cents,
  listCents,
  size = "md",
  showDiscount = false,
}: {
  cents: number;
  listCents?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  showDiscount?: boolean;
}) {
  const { dollars, cents: c } = priceParts(cents);
  const pct = discountPct(cents, listCents ?? null);
  const big = { sm: "text-lg", md: "text-2xl", lg: "text-3xl", xl: "text-4xl" }[size];
  const small = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg" }[size];
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {showDiscount && pct > 0 && (
        <span className="rounded-control bg-deal-soft px-1.5 py-0.5 text-sm font-bold text-deal">-{pct}%</span>
      )}
      <span className={`font-extrabold tracking-tight text-ink ${big}`}>
        <span className="sr-only">{money(cents)}</span>
        <span aria-hidden="true">
          {dollars}
          <span className={`align-top font-bold ${small}`}>.{c}</span>
        </span>
      </span>
      {listCents && listCents > cents ? (
        <span className="text-sm text-ink-muted">
          <span className="sr-only">List price </span>
          <s>{money(listCents)}</s>
        </span>
      ) : null}
    </span>
  );
}
