import { cookies } from "next/headers";

import type { SessionUser } from "@/types/user";

import { apiGet } from "./api-server";

export const SESSION_COOKIE = "apex_session";

/**
 * Current signed-in user, or null for guests. Without a session cookie there is
 * no network call at all.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return null;
  const res = await apiGet<SessionUser>("/auth/me", { auth: true });
  return res.ok ? res.data : null;
}
