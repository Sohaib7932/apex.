import { Globe } from "lucide-react";
import { Suspense } from "react";

import { Logo } from "@/components/ui/Logo";

import { AccountMenu, CartLink, DeliverTo, HeaderModeSwitch, OrdersLink } from "./HeaderUser";
import { SearchBar, SearchBarFallback } from "./SearchBar";

/**
 * Global header (PRD 4.1). Wide screens (1440px+): one row. Narrower: logo, account and
 * cart on the first row; search gets its own full-width row so it is never squeezed.
 */
export function Header() {
  return (
    <header id="top" className="bg-chrome text-on-chrome">
      <div className="mx-auto flex max-w-375 flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 wide:flex-nowrap">
        <Logo />
        <DeliverTo />

        <div className="order-last hidden basis-full md:flex wide:order-none wide:min-w-0 wide:flex-1 wide:basis-auto">
          <Suspense fallback={<SearchBarFallback />}>
            <SearchBar />
          </Suspense>
        </div>

        <span className="hidden shrink-0 items-center gap-1 px-2 text-xs font-semibold wide:flex">
          <Globe aria-hidden="true" className="size-4" />
          EN <span className="text-on-chrome-muted">/ USD</span>
        </span>

        <HeaderModeSwitch className="hidden shrink-0 lg:ml-auto lg:inline-flex wide:ml-0" />

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <AccountMenu />
          <OrdersLink />
          <CartLink />
        </div>
      </div>

      <div className="px-3 pb-2 md:hidden">
        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar />
        </Suspense>
      </div>
      <HeaderModeSwitch className="mx-auto mb-2 flex w-fit lg:hidden" />
    </header>
  );
}
