import Link from "next/link";

/** Original Apex mark: a peak inside a rounded square, plus the wordmark. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Apex home"
      className={`flex shrink-0 items-center gap-2 rounded-control px-1 py-1 text-on-chrome ${className}`}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M7 23 L16 8 L25 23"
          fill="none"
          stroke="#000"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12.5 23 L19.5 23" stroke="#000" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight">apex</span>
    </Link>
  );
}
