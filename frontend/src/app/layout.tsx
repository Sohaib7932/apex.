import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SubNav } from "@/components/layout/SubNav";
import { getSessionUser } from "@/lib/session";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Apex Marketplace", template: "%s | Apex" },
  description: "Shop electronics, computing, smart home and kitchen gear on Apex.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header user={user} cartCount={0} />
        {/* SubNav reads the query string for its active tab, so it renders on the client. */}
        <Suspense fallback={<div className="h-11 bg-chrome-2" />}>
          <SubNav />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
