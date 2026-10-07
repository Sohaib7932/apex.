"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/States";

/** Errors inside storefront pages keep the department bar and footer around them. */
export default function ShopError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-375 px-4 py-10 md:px-6">
      <ErrorState title="Something went wrong" onRetry={() => retry()} />
    </div>
  );
}
