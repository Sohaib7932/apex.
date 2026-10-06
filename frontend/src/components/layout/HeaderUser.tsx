"use client";

import { ChevronDown, LogOut, MapPin, Package, ShoppingCart, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

import { ModeSwitch } from "./ModeSwitch";

const chromeLink =
  "flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1.5 text-on-chrome hover:bg-chrome-2";

function Stacked({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className="flex flex-col text-left leading-tight">
      <span className="text-2xs text-on-chrome-muted">{top}</span>
      <span className="text-sm font-bold">{bottom}</span>
    </span>
  );
}

export function DeliverTo() {
  const { user } = useAuth();
  return (
    <Link href="/info/delivery-location" className={`${chromeLink} hidden lg:flex`}>
      <MapPin aria-hidden="true" className="size-4 text-primary" />
      <Stacked top={user ? `Deliver to ${user.name.split(" ")[0]}` : "Deliver to"} bottom="Set location" />
    </Link>
  );
}

export function HeaderModeSwitch({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return <ModeSwitch hasStore={user.seller !== null} className={className} />;
}

export function OrdersLink() {
  return (
    <Link href="/orders" className={`${chromeLink} hidden md:flex`}>
      <Stacked top="Returns" bottom="& Orders" />
    </Link>
  );
}

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className={chromeLink} aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}>
      <span className="relative">
        <ShoppingCart aria-hidden="true" className="size-6" />
        <span
          aria-hidden="true"
          className={`absolute -top-2 -right-2.5 grid h-5 min-w-5 place-items-center rounded-pill px-1 text-2xs font-bold ${
            count > 0 ? "bg-primary text-on-primary" : "bg-chrome-2 text-on-chrome-muted"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      </span>
      <span className="hidden text-sm font-bold sm:inline">Cart</span>
    </Link>
  );
}

export function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link href="/login" className={chromeLink}>
        <UserRound aria-hidden="true" className="size-5 sm:hidden" />
        <span className="sr-only sm:not-sr-only">
          <Stacked top="Hello, sign in" bottom="Account & Lists" />
        </span>
      </Link>
    );
  }

  const first = user.name.split(" ")[0];
  const item = "flex min-h-11 items-center gap-3 px-4 text-sm hover:bg-surface-tint";
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        className={chromeLink}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <UserRound aria-hidden="true" className="size-5 sm:hidden" />
        <span className="sr-only sm:not-sr-only">
          <Stacked top={`Hello, ${first}`} bottom="Account & Lists" />
        </span>
        <ChevronDown aria-hidden="true" className="hidden size-3.5 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-card bg-surface py-1 text-ink shadow-pop">
          <p className="border-b border-line px-4 py-3 text-sm">
            Signed in as <span className="font-bold">{user.email}</span>
          </p>
          <Link href="/account" className={item} onClick={() => setOpen(false)}>
            <UserRound aria-hidden="true" className="size-4" /> Your Account
          </Link>
          <Link href="/orders" className={item} onClick={() => setOpen(false)}>
            <Package aria-hidden="true" className="size-4" /> Your Orders
          </Link>
          <Link href={user.seller ? "/seller" : "/seller/start"} className={item} onClick={() => setOpen(false)}>
            <Store aria-hidden="true" className="size-4" /> {user.seller ? "Seller workspace" : "Start selling"}
          </Link>
          <button
            type="button"
            className={`${item} w-full border-t border-line`}
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut aria-hidden="true" className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
