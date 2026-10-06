"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">Something went wrong</h1>
      <p className="mt-3 text-ink-muted">Please try again. If it keeps happening, come back in a minute.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-control bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
