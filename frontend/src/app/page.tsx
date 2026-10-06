import { ApiStatus } from "@/components/ui/ApiStatus";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 md:px-6">
      <section className="rounded-card bg-surface-tint p-6 md:p-10">
        <p className="mb-3 inline-block rounded-control bg-primary px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-on-primary">
          Milestone 1
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Apex storefront shell</h1>
        <p className="mt-3 max-w-xl text-base text-ink-muted">
          Header, sub-navigation and footer are in place. The full home page arrives in Milestone 2.
        </p>
        <div className="mt-6">
          <ApiStatus />
        </div>
      </section>
    </div>
  );
}
