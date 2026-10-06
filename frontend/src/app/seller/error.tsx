"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

export default function SellerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="rounded-card bg-surface p-10 text-center shadow-card">
      <h1 className="text-2xl font-extrabold">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-ink-muted">Something went wrong in the seller workspace. Please try again.</p>
      <Button variant="seller" className="mt-6" onClick={() => retry()}>
        <RotateCw aria-hidden="true" className="size-4" /> Try again
      </Button>
    </div>
  );
}
