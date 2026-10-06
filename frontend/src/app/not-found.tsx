import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-accent-text">404</p>
      <h1 className="mt-2 text-2xl font-extrabold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-ink-muted">It may have moved, or it hasn&apos;t been built yet.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
      >
        Go to the home page
      </Link>
    </div>
  );
}
