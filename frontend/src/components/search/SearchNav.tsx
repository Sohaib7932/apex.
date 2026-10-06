"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";

type Nav = { navigate: (href: string) => void; pending: boolean };

const SearchNavContext = createContext<Nav | null>(null);

/** Shared navigation for the search page: filters and sort dim the results while loading. */
export function SearchNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string) => startTransition(() => router.push(href, { scroll: false })),
    [router],
  );
  const value = useMemo(() => ({ navigate, pending }), [navigate, pending]);
  return <SearchNavContext.Provider value={value}>{children}</SearchNavContext.Provider>;
}

export function useSearchNav(): Nav {
  const ctx = useContext(SearchNavContext);
  if (!ctx) throw new Error("useSearchNav must be used inside SearchNavProvider");
  return ctx;
}

/** Results wrapper that fades while a new search is loading. */
export function ResultsArea({ children }: { children: ReactNode }) {
  const { pending } = useSearchNav();
  return (
    <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}>
      {children}
    </div>
  );
}
