import { Star } from "lucide-react";

import { compactCount } from "@/lib/format";

/** Five stars with partial fill, plus an optional numeric rating and count. */
export function StarRating({
  rating,
  count,
  size = "sm",
  showValue = true,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const px = size === "md" ? "size-5" : "size-4";
  const stars = (extra: string) =>
    [0, 1, 2, 3, 4].map((i) => <Star key={i} aria-hidden="true" className={`${px} shrink-0 fill-current ${extra}`} />);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        <span className="flex text-line">{stars("")}</span>
        <span
          className="absolute inset-y-0 left-0 flex overflow-hidden text-star"
          style={{ width: `${(rating / 5) * 100}%` }}
        >
          {stars("")}
        </span>
      </span>
      {showValue && <span className="text-sm font-semibold text-ink">{rating.toFixed(1)}</span>}
      {count !== undefined && <span className="text-sm text-ink-muted">({compactCount(count)})</span>}
    </span>
  );
}
