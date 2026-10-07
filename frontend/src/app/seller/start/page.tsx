import { BarChart3, Package, Truck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StartSellingForm } from "@/components/seller/StartSellingForm";
import { requireUser } from "@/lib/guards";

export const metadata: Metadata = { title: "Start selling" };

export default async function StartSellingPage() {
  const user = await requireUser("/seller/start");
  if (user.seller) redirect("/seller");
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wide text-accent-text">Start selling on Apex</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Open your store</h1>
        <p className="mt-2 text-base text-ink-muted">
          Hi {user.name.split(" ")[0]}, it takes one step. You can still shop as usual; switch modes any time from
          the header.
        </p>
        <div className="mt-8">
          <StartSellingForm />
        </div>
      </section>
      <aside className="rounded-card bg-chrome p-6 text-on-chrome">
        <h2 className="text-lg font-bold">What you get</h2>
        <ul className="mt-5 space-y-5 text-sm">
          {[
            { icon: Package, t: "List products", d: "Add photos, variants and badges. Publish when you're ready." },
            { icon: Truck, t: "Ship your orders", d: "See your orders and mark them shipped. Buyers see it right away." },
            { icon: BarChart3, t: "Track sales", d: "Revenue, orders and a 30-day sales chart on your Overview." },
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
