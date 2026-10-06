import type { SessionUser } from "@/types/user";

/**
 * Current signed-in user, or null for guests.
 *
 * Auth arrives in Milestone 5; until then everyone is a guest, so the
 * Buying/Selling switch (signed-in only) stays hidden in the header.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}
