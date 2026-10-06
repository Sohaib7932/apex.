import type { ReactNode } from "react";

type Tone = "dark" | "orange" | "deal" | "soft" | "seller" | "success" | "muted";

const tones: Record<Tone, string> = {
  dark: "bg-chrome text-on-chrome",
  orange: "bg-primary text-on-primary",
  deal: "bg-deal-soft text-deal",
  soft: "bg-primary-soft text-accent-text",
  seller: "bg-seller-soft text-seller",
  success: "bg-success-soft text-success",
  muted: "bg-surface-tint-2 text-ink-muted",
};

export function Badge({
  tone = "dark",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-2xs font-bold uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Product badge text from the catalog ("Best Seller", "Limited Deal", ...). */
export function ProductBadge({ label }: { label: string }) {
  const tone: Tone = label === "Limited Deal" ? "orange" : label === "New Arrival" ? "soft" : "dark";
  return <Badge tone={tone}>{label}</Badge>;
}
