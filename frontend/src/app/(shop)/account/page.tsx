import { ChevronRight, MapPin, Package, Store, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { apiGet } from "@/lib/api-server";
import { requireUser } from "@/lib/guards";
import type { SavedAddress } from "@/types/api";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const addresses = await apiGet<SavedAddress[]>("/addresses", { auth: true });

  const tiles = [
    { href: "/orders", icon: Package, title: "Your Orders", body: "Track, review and buy again" },
    user.seller
      ? { href: "/seller", icon: Store, title: "Seller workspace", body: `Manage ${user.seller.store_name}` }
      : { href: "/seller/start", icon: Store, title: "Start selling", body: "Open a store in under a minute" },
    { href: "/cart", icon: UserRound, title: "Your Cart", body: "Items you're thinking about" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Your account</h1>
      <p className="mt-1 text-ink-muted">
        Signed in as <span className="font-semibold text-ink">{user.name}</span> ({user.email})
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {tiles.map(({ href, icon: Icon, title, body }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full items-center gap-4 rounded-card bg-surface p-5 shadow-card hover:bg-surface-tint"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-pill bg-primary-soft text-accent-text">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{title}</span>
                <span className="text-sm text-ink-muted">{body}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="addresses-title" className="mt-10">
        <h2 id="addresses-title" className="text-xl font-extrabold">
          Saved addresses
        </h2>
        {!addresses.ok ? (
          <p className="mt-3 text-sm text-ink-muted">We couldn&apos;t load your addresses right now.</p>
        ) : addresses.data.length === 0 ? (
          <p className="mt-3 rounded-card bg-surface p-5 text-sm text-ink-muted shadow-card">
            No saved addresses yet. The address you use at checkout is saved here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {addresses.data.map((a) => (
              <li key={a.id} className="rounded-card bg-surface p-5 text-sm shadow-card">
                <p className="flex items-center gap-2 font-bold">
                  <MapPin aria-hidden="true" className="size-4 text-accent-text" />
                  {a.full_name}
                  {a.is_default && (
                    <span className="rounded-control bg-surface-tint-2 px-2 py-0.5 text-2xs font-bold uppercase">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-2 text-ink-muted">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.zip}
                  <br />
                  {a.phone}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <SignOutButton />
      </div>
    </div>
  );
}
