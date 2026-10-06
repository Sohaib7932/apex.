import { SearchX } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";

const POPULAR = [
  { label: "Headphones", href: "/search?category=audio" },
  { label: "Keyboards", href: "/search?category=keyboards" },
  { label: "Laptops", href: "/search?category=laptops" },
  { label: "Today's Deals", href: "/search?deals=today" },
];

/** Shared 404 content; the root and storefront not-found pages wrap it. */
export function NotFoundContent() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
      <span className="mx-auto grid size-16 place-items-center rounded-pill bg-primary-soft text-accent-text">
        <SearchX aria-hidden="true" className="size-8" />
      </span>
      <p className="mt-6 text-sm font-bold uppercase tracking-wide text-accent-text">Error 404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-base text-ink-muted">
        The link may be old, or the product may no longer be for sale. Try searching, or start from one of these:
      </p>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {POPULAR.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-tint"
            >
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
      <ButtonLink href="/" size="lg" className="mt-8">
        Go to the home page
      </ButtonLink>
    </div>
  );
}
