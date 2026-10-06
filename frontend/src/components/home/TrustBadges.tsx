import { Headset, RotateCcw, ShieldCheck } from "lucide-react";

const BADGES = [
  {
    icon: ShieldCheck,
    title: "Authentic items, verified",
    body: "Every store is reviewed and every listing comes from the brand or an authorized seller.",
  },
  {
    icon: RotateCcw,
    title: "Free 30-day returns",
    body: "Changed your mind? Send it back within 30 days, no questions asked.",
  },
  {
    icon: Headset,
    title: "24/7 priority support",
    body: "Real people ready to help with orders, delivery and returns, any time.",
  },
];

export function TrustBadges() {
  return (
    <section aria-label="Why shop with Apex" className="mx-auto max-w-375 px-4 py-10 md:px-6">
      <ul className="grid gap-3 md:grid-cols-3">
        {BADGES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 rounded-card bg-surface p-5 shadow-card">
            <span className="grid size-12 shrink-0 place-items-center rounded-pill bg-primary-soft text-accent-text">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
