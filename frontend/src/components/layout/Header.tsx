import { Globe, MapPin, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import type { SessionUser } from "@/types/user";

import { ModeSwitch } from "./ModeSwitch";
import { SearchBar } from "./SearchBar";

type Props = {
  user: SessionUser | null;
  cartCount: number;
};

/** Small two-line label used by header links ("Hello, Alex / Account & Lists"). */
function Stacked({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-2xs text-on-chrome-muted">{top}</span>
      <span className="text-sm font-bold">{bottom}</span>
    </span>
  );
}

const chromeLink =
  "flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1.5 text-on-chrome hover:bg-chrome-2";

export function Header({ user, cartCount }: Props) {
  const firstName = user?.name.split(" ")[0];

  return (
    <header id="top" className="bg-chrome text-on-chrome">
      <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <Logo />

        <Link href="/info/delivery-location" className={`${chromeLink} hidden lg:flex`}>
          <MapPin aria-hidden="true" className="size-4 text-primary" />
          <Stacked top="Deliver to" bottom="Set location" />
        </Link>

        <SearchBar className="hidden flex-1 md:flex" />

        <span className="hidden shrink-0 items-center gap-1 px-2 text-xs font-semibold xl:flex">
          <Globe aria-hidden="true" className="size-4" />
          EN <span className="text-on-chrome-muted">/ USD</span>
        </span>

        {user && <ModeSwitch hasStore={user.seller !== null} className="hidden shrink-0 lg:inline-flex" />}

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href={user ? "/info/account" : "/login"} className={chromeLink}>
            <UserRound aria-hidden="true" className="size-5 sm:hidden" />
            <span className="sr-only sm:not-sr-only">
              <Stacked top={user ? `Hello, ${firstName}` : "Hello, sign in"} bottom="Account & Lists" />
            </span>
          </Link>

          <Link href="/orders" className={`${chromeLink} hidden md:flex`}>
            <Stacked top="Returns" bottom="& Orders" />
          </Link>

          <Link href="/cart" className={chromeLink} aria-label={`Cart, ${cartCount} items`}>
            <span className="relative">
              <ShoppingCart aria-hidden="true" className="size-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-pill bg-primary px-1 text-2xs font-bold text-on-primary">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="hidden text-sm font-bold sm:inline">Cart</span>
          </Link>
        </div>
      </div>

      {/* Mobile: search gets its own full-width row and stays visible. */}
      <div className="px-3 pb-2 md:hidden">
        <SearchBar />
      </div>
      {user && (
        <div className="flex justify-center px-3 pb-2 lg:hidden">
          <ModeSwitch hasStore={user.seller !== null} />
        </div>
      )}
    </header>
  );
}
