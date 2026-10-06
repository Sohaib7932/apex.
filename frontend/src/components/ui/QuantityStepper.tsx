"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

/** Large tap targets (44px). At quantity 1 the minus becomes a remove button if onRemove is given. */
export function QuantityStepper({
  value,
  max,
  onChange,
  onRemove,
  label,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  onRemove?: () => void;
  label: string;
  disabled?: boolean;
}) {
  const canRemove = value <= 1 && onRemove;
  const btn =
    "grid size-11 place-items-center rounded-control text-ink hover:bg-surface-tint-2 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div
      className="inline-flex items-center rounded-control border-2 border-primary bg-surface"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={btn}
        disabled={disabled || (value <= 1 && !onRemove)}
        aria-label={canRemove ? "Remove item" : "Decrease quantity"}
        onClick={() => (canRemove ? onRemove() : onChange(value - 1))}
      >
        {canRemove ? <Trash2 aria-hidden="true" className="size-4" /> : <Minus aria-hidden="true" className="size-4" />}
      </button>
      <span className="min-w-8 text-center text-base font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
