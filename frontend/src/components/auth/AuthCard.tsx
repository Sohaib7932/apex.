import { Lock, RotateCcw, Truck } from "lucide-react";
import type { ReactNode } from "react";

/** Centered card layout shared by the sign-in and sign-up pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_22rem] lg:items-start">
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-10">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-base text-ink-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </section>
      <aside className="hidden rounded-card bg-chrome p-6 text-on-chrome lg:block">
        <h2 className="text-lg font-bold">Why shop with an Apex account</h2>
        <ul className="mt-5 space-y-5 text-sm">
          {[
            { icon: Truck, t: "Track every order", d: "See each item's shipping status, store by store." },
            { icon: RotateCcw, t: "Your cart follows you", d: "Items you added as a guest are kept when you sign in." },
            { icon: Lock, t: "Secure checkout", d: "Payments run through Stripe. We never see your card." },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-3">
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-bold">{t}</span>
                <span className="text-on-chrome-muted">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
