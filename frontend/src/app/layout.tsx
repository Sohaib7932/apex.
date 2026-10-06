import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { Header } from "@/components/layout/Header";
import { Providers } from "@/context/Providers";
import { getSessionUser } from "@/lib/session";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Apex Marketplace", template: "%s | Apex" },
  description: "Shop electronics, computing, smart home and kitchen gear from independent stores on Apex.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

// Every page reads the session cookie, so pages render per request and never
// need the API during `next build`.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-control bg-primary px-4 py-2 font-bold text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <Providers user={user}>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
