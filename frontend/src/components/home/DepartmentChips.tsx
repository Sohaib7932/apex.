import { Cable, Coffee, Headphones, House, Keyboard, Laptop, Monitor, Shapes, Watch, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Category } from "@/types/api";

const ICONS: Record<string, LucideIcon> = {
  headphones: Headphones,
  laptop: Laptop,
  keyboard: Keyboard,
  monitor: Monitor,
  house: House,
  coffee: Coffee,
  cable: Cable,
  watch: Watch,
};

export function DepartmentChips({ departments }: { departments: Category[] }) {
  if (!departments.length) return null;
  return (
    <section aria-labelledby="departments-title" className="mx-auto max-w-375 px-4 py-10 md:px-6">
      <SectionHeading
        id="departments-title"
        title="Curated Departments"
        subtitle="Browse hand-picked categories from trusted stores"
        link={{ href: "/search", label: "View all categories" }}
      />
      <ul className="grid grid-cols-4 gap-2 sm:gap-3 md:grid-cols-8">
        {departments.map((d) => {
          const Icon = ICONS[d.icon ?? ""] ?? Shapes;
          return (
            <li key={d.slug}>
              <Link
                href={`/search?category=${d.slug}`}
                className="flex h-full flex-col items-center gap-2 rounded-card bg-surface p-3 text-center shadow-card transition-colors hover:bg-primary-soft"
              >
                <span className="grid size-12 place-items-center rounded-pill bg-surface-tint text-ink">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <span className="text-xs leading-tight font-semibold sm:text-sm">{d.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
