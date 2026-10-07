import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  dark: "bg-chrome text-on-chrome hover:bg-chrome-2",
  secondary: "bg-surface-tint-2 text-ink hover:bg-surface-tint-3",
  ghost: "bg-transparent text-ink hover:bg-surface-tint",
  outline: "border border-line bg-surface text-ink hover:bg-surface-tint",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3 text-sm sm:min-h-9",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return `inline-flex items-center justify-center gap-2 rounded-control font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean };

export function Button({ variant, size, loading, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-pill border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
