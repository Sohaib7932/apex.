import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/safe-next";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return (
    <AuthCard title="Create account" subtitle="It takes less than a minute. Anything in your cart comes with you.">
      <AuthForm mode="signup" next={next} />
    </AuthCard>
  );
}
