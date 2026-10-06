import { ShieldCheck, Truck, Zap } from "lucide-react";

import { CutoffCountdown } from "@/components/ui/Countdown";

/** Thin service bar under the sub-nav on the home page. */
export function DeliveryBar() {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-375 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs md:px-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 font-bold text-accent-text">
            <Zap aria-hidden="true" className="size-4 fill-primary text-primary" />
            Flash Express Dispatch active
          </span>
          <span className="text-ink-muted">
            Order within <CutoffCountdown className="font-bold text-ink" /> for One-Day delivery
          </span>
        </p>
        <p className="hidden items-center gap-4 text-ink-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <Truck aria-hidden="true" className="size-4" /> Free delivery over $35
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck aria-hidden="true" className="size-4" /> 30-day returns
          </span>
        </p>
      </div>
    </div>
  );
}
