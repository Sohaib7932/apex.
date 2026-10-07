"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";

/** Last-resort error screen; same look as the in-page error states. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <div role="alert" className="flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center shadow-card">
          <span className="grid size-16 place-items-center rounded-pill bg-deal-soft text-deal">
            <CircleAlert aria-hidden="true" className="size-8" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-ink-muted">
            Please try again. If the store was asleep, it can take a few seconds to wake up.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => retry()}>
              <RotateCw aria-hidden="true" className="size-4" /> Try again
            </Button>
            <ButtonLink href="/" variant="outline">
              Go to the home page
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
