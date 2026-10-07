"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/States";

export default function SellerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState title="This page didn't load" onRetry={() => retry()} />;
}
