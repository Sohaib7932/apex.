import { Suspense, type ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { SubNav } from "@/components/layout/SubNav";

/** Storefront chrome: department bar under the header, full footer. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* SubNav reads the query string for its active tab, so it renders on the client. */}
      <Suspense fallback={<div className="h-11 bg-chrome-2" />}>
        <SubNav />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
