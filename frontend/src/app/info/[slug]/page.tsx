import Link from "next/link";

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: PageProps<"/info/[slug]">) {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

/** Placeholder target for footer and help links (PRD 4.1). */
export default async function InfoPage({ params }: PageProps<"/info/[slug]">) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold">{titleFromSlug(slug)}</h1>
      <p className="mt-3 text-ink-muted">This page is a placeholder in the Apex demo.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-accent-text hover:underline">
        Back to shopping
      </Link>
    </div>
  );
}
