"use client";

import { Zap } from "lucide-react";

import { useNow } from "@/hooks/useNow";
import { addDays, deliveryDays, deliveryLabel } from "@/lib/format";
import type { DeliverySpeed } from "@/types/api";

const shortDay = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

/** "One-Day  Get it Tomorrow, Oct 24" computed in the visitor's timezone. */
export function DeliveryLine({ speed, compact = false }: { speed: DeliverySpeed; compact?: boolean }) {
  const now = useNow(60_000);
  const days = deliveryDays[speed];
  let when = "soon";
  if (now !== null) {
    const date = addDays(new Date(now), days);
    when = days === 1 ? `Tomorrow, ${shortDay.format(date).split(", ")[1]}` : shortDay.format(date);
  }
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
      {speed === "one_day" && <Zap aria-hidden="true" className="size-4 shrink-0 fill-primary text-primary" />}
      <span className="font-bold text-ink">{deliveryLabel[speed]}</span>
      <span>
        {compact ? "" : "Get it "}
        <span className="font-semibold text-ink">{when}</span>
      </span>
    </p>
  );
}
