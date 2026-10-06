export function ProgressBar({
  value,
  label,
  tone = "primary",
}: {
  value: number;
  label: string;
  tone?: "primary" | "seller";
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-pill bg-surface-tint-3"
    >
      <div
        className={`h-full rounded-pill ${tone === "seller" ? "bg-seller" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
