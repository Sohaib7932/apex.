"use client";

import { useSyncExternalStore } from "react";

/**
 * Current time in ms, ticking every `intervalMs`. Returns null during server
 * render and hydration, so time-dependent text never causes a mismatch.
 */
export function useNow(intervalMs = 1000): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}
