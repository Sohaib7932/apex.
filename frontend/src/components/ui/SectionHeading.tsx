import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeading({
  tag,
  title,
  subtitle,
  link,
  id,
  children,
}: {
  tag?: string;
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {tag && (
            <span className="rounded-control bg-primary px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-on-primary">
              {tag}
            </span>
          )}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {link && (
        <Link
          href={link.href}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-accent-text hover:underline"
        >
          {link.label}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
      {children}
    </div>
  );
}
