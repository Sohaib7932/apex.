import { Suspense } from "react";

import { Footer } from "@/components/layout/Footer";
import { NotFoundContent } from "@/components/layout/NotFoundContent";
import { SubNav } from "@/components/layout/SubNav";

/** Unknown URLs: rendered outside the storefront layout, so it brings its own chrome. */
export default function NotFound() {
  return (
    <>
      <Suspense fallback={<div className="h-11 bg-chrome-2" />}>
        <SubNav />
      </Suspense>
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
