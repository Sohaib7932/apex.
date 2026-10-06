import { Globe } from "lucide-react";
import { Suspense } from "react";

import { Logo } from "@/components/ui/Logo";

import { AccountMenu, CartLink, DeliverTo, HeaderModeSwitch, OrdersLink } from "./HeaderUser";
import { SearchBar, SearchBarFallback } from "./SearchBar";

/**
 * Global header (PRD 4.1). Desktop: one row. Mobile: logo, account and cart on the
 * first row; search gets its own full-width row and stays visible.
 */
export function Header() {
  return (
    <header id="top" className="bg-chrome text-on-chrome">
      <div className="mx-auto flex max-w-375 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <Logo />
        <DeliverTo />

        <div className="hidden min-w-0 flex-1 md:flex">
          <Suspense fallback={<SearchBarFallback />}>
            <SearchBar />
          </Suspense>
        </div>

        <span className="hidden shrink-0 items-center gap-1 px-2 text-xs font-semibold xl:flex">
          <Globe aria-hidden="true" className="size-4" />
          EN <span className="text-on-chrome-muted">/ USD</span>
        </span>

        <HeaderModeSwitch className="hidden shrink-0 lg:inline-flex" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
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
