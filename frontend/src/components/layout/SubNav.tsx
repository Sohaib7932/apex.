"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { departments, subNavLinks, type NavLink } from "@/lib/nav";

/** True when the current URL matches every query param in the link's href. */
function isActive(link: NavLink, pathname: string, params: URLSearchParams): boolean {
  const url = new URL(link.href, "http://x");
  if (url.pathname !== pathname) return false;
  for (const [key, value] of url.searchParams) {
    if (params.get(key) !== value) return false;
  }
  return true;
}

/**
 * Category bar under the header. On narrow screens the links scroll sideways,
 * and "All" opens a drawer with every department.
 */
export function SubNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const drawer = useRef<HTMLDialogElement>(null);

  return (
    <nav aria-label="Departments" className="bg-chrome-2 text-on-chrome">
      <div className="mx-auto flex max-w-[1500px] items-center gap-1 px-3 sm:px-4">
        <button
          type="button"
          onClick={() => drawer.current?.showModal()}
          className="flex shrink-0 items-center gap-1.5 rounded-control px-2 py-2.5 text-sm font-bold hover:bg-chrome"
        >
          <Menu aria-hidden="true" className="size-5" />
          All
        </button>

        <ul className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
          {subNavLinks.map((link) => {
            const active = isActive(link, pathname, params);
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative block px-2.5 py-2.5 text-sm whitespace-nowrap transition-colors hover:text-on-chrome ${
                    active
                      ? "font-semibold text-on-chrome after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-pill after:bg-primary"
                      : "text-on-chrome-muted"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <dialog
        ref={drawer}
        aria-label="All departments"
        onClick={(e) => {
          // A click on the backdrop lands on the <dialog> itself.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-0 h-dvh max-h-none w-[min(20rem,85vw)] bg-surface p-0 text-ink shadow-pop backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between bg-chrome px-4 py-3 text-on-chrome">
          <span className="text-base font-bold">Shop by department</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => drawer.current?.close()}
            className="rounded-control p-1 hover:bg-chrome-2"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <ul className="py-2" onClick={() => drawer.current?.close()}>
          {departments.map((d) => (
            <li key={d.value}>
              <Link
                href={d.value ? `/search?category=${d.value}` : "/search"}
                className="block px-4 py-3 text-sm font-medium hover:bg-surface-tint"
              >
                {d.label}
              </Link>
            </li>
          ))}
          <li className="my-2 border-t border-line" aria-hidden="true" />
          {subNavLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block px-4 py-3 text-sm hover:bg-surface-tint">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </nav>
  );
}
