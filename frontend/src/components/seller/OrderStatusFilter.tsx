import Link from "next/link";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "to_ship", label: "To ship" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrderStatusFilter({ active }: { active: string }) {
  return (
    <nav aria-label="Filter orders" className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Link
          key={f.value}
          href={f.value === "all" ? "/seller/orders" : `/seller/orders?status=${f.value}`}
          aria-current={active === f.value ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-pill px-4 text-sm font-semibold ${
            active === f.value ? "bg-chrome text-on-chrome" : "bg-surface text-ink shadow-card hover:bg-surface-tint"
          }`}
        >
          {f.label}
        </Link>
      ))}
    </nav>
  );
}
