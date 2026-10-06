import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SellerShell } from "@/components/seller/SellerShell";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Seller workspace", template: "%s | Apex Seller" } };

/** Each page checks access itself (it knows its own return URL); the layout only draws the shell. */
export default async function SellerLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  return <SellerShell store={user?.seller ?? null}>{children}</SellerShell>;
}
