import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/safe-next";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return (
    <AuthCard
      title="Sign in"
      subtitle={next.startsWith("/checkout") ? "Sign in to finish checking out. Your cart is saved." : "Welcome back to Apex."}
    >
      <AuthForm mode="login" next={next} />
    </AuthCard>
  );
}
