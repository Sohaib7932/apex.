"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

/**
 * Horizontal scroller: native touch scrolling with snap points, plus arrow buttons
 * for mouse and keyboard users. Each child is one card.
 */
export function Carousel({ label, children }: { label: string; children: ReactNode[] }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  const arrow =
    "grid size-11 place-items-center rounded-pill border border-line bg-surface text-ink shadow-card hover:bg-surface-tint";
  return (
    <section aria-label={label} className="relative">
      <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
        <button type="button" className={arrow} onClick={() => scroll(-1)} aria-label={`Scroll ${label} left`}>
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button type="button" className={arrow} onClick={() => scroll(1)} aria-label={`Scroll ${label} right`}>
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
      <ul
        ref={track}
        tabIndex={0}
        className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {children.map((child, i) => (
          <li key={i} className="w-[72%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[23.5%]">
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}
