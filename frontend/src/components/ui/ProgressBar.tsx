export function ProgressBar({ value, label }: { value: number; label: string }) {
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
        className="h-full rounded-pill bg-primary"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
