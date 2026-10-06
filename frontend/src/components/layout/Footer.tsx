import { DollarSign, Flag, Globe } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { footerColumns, legalLinks } from "@/lib/nav";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-chrome text-on-chrome">
      <a
        href="#top"
        className="block bg-chrome-2 py-3 text-center text-sm font-medium text-on-chrome-muted hover:text-on-chrome"
      >
        Back to top
      </a>

      <div className="mx-auto grid max-w-375 grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 md:grid-cols-4 md:px-6">
        {footerColumns.map((col) => (
          <section key={col.title}>
            <h2 className="mb-3 text-base font-bold">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-on-chrome-muted hover:text-on-chrome hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="bg-chrome-2">
        <div className="mx-auto flex max-w-375 flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Logo className="mr-2" />
            {[
              { icon: Globe, label: "English" },
              { icon: DollarSign, label: "USD - U.S. Dollar" },
              { icon: Flag, label: "United States" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-control border border-chrome-line px-2.5 py-1 text-xs font-semibold"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs font-semibold hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-on-chrome-muted">© {year} Apex Marketplace. Demo project, not a real store.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
