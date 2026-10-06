"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function SignOutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden="true" className="size-4" />
      Sign out
    </Button>
  );
}
