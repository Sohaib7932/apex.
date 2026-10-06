import { ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { infoPages } from "@/lib/nav";

export async function generateMetadata({ params }: PageProps<"/info/[slug]">) {
  const { slug } = await params;
  return { title: infoPages[slug]?.title ?? "Help" };
}

/** Shared simple page behind every footer and help link (PRD 4.1). */
export default async function InfoPage({ params }: PageProps<"/info/[slug]">) {
  const { slug } = await params;
  const page = infoPages[slug];
  if (!page) notFound();

  const others = Object.entries(infoPages)
    .filter(([s]) => s !== slug)
    .slice(0, 8);

  return (
    <div className="mx-auto grid max-w-375 gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1fr_18rem]">
      <article className="rounded-card bg-surface p-6 shadow-card sm:p-10">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-ink-muted">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <ChevronRight aria-hidden="true" className="size-4" />
          <span>Help</span>
        </nav>
        <span className="grid size-12 place-items-center rounded-pill bg-primary-soft text-accent-text">
          <Info aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{page.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">{page.body}</p>
        <p className="mt-6 text-sm text-ink-muted">
          Apex is a demo store. Need something else?{" "}
          <Link href="/info/customer-service" className="font-semibold text-accent-text hover:underline">
            Visit Customer Service
          </Link>
          .
        </p>
      </article>
      <aside aria-label="More help topics" className="rounded-card bg-surface p-5 shadow-card">
        <h2 className="text-base font-bold">More help topics</h2>
        <ul className="mt-3 space-y-1">
          {others.map(([s, p]) => (
            <li key={s}>
              <Link href={`/info/${s}`} className="flex min-h-11 items-center text-sm hover:text-accent-text hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
