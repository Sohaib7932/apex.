import { Truck } from "lucide-react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { money } from "@/lib/format";
import type { CartSummary } from "@/types/api";

export function FreeDeliveryProgress({ summary }: { summary: CartSummary }) {
  const threshold = summary.free_shipping_threshold_cents;
  const remaining = summary.amount_to_free_shipping_cents;
  const pct = threshold ? ((threshold - remaining) / threshold) * 100 : 100;
  const unlocked = remaining <= 0;
  return (
    <section
      aria-label="Free delivery progress"
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="flex flex-1 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-pill bg-primary-soft text-accent-text">
          <Truck aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-base font-bold">
            {unlocked ? "Your order qualifies for FREE delivery" : `Add ${money(remaining)} for FREE delivery`}
          </p>
          <p className="text-sm text-ink-muted">
            {unlocked
              ? "Standard delivery is on us. One-Day delivery is available at checkout."
              : `Orders of ${money(threshold)} or more ship free.`}
          </p>
        </div>
      </div>
      <div className="w-full sm:w-64">
        <div className="mb-1 flex justify-between text-xs font-semibold text-ink-muted">
          <span>Free delivery threshold</span>
          <span className={unlocked ? "font-bold text-accent-text" : ""}>{unlocked ? "Unlocked" : `${Math.round(pct)}%`}</span>
        </div>
        <ProgressBar value={pct} label="Progress toward free delivery" />
      </div>
    </section>
  );
}
