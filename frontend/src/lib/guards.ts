import { redirect } from "next/navigation";

import type { SessionUser } from "@/types/user";

import { getSessionUser } from "./session";

/** Signed-in user, or a redirect to sign in that comes back to `returnTo`. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Signed-in user who owns a store; others go to sign in or "Start selling". */
export async function requireSeller(returnTo: string): Promise<SessionUser & { seller: NonNullable<SessionUser["seller"]> }> {
  const user = await requireUser(returnTo);
  if (!user.seller) redirect("/seller/start");
  return user as SessionUser & { seller: NonNullable<SessionUser["seller"]> };
}
