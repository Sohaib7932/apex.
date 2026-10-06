"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, errorMessage } from "@/lib/api-client";
import type { Cart, CartLine } from "@/types/api";

import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

/**
 * Cart state for the whole app.
 * - Guests: lines live in localStorage; the server prices them (POST /cart/price).
 * - Signed in: the server cart (/cart). On sign-in the guest cart is merged
 *   (higher quantity wins) and cleared locally.
 * Totals always come from the server.
 */

type GuestLine = {
  product_id: number;
  variant_id: number | null;
  edition_id: number | null;
  quantity: number;
  saved_for_later: boolean;
  selected: boolean;
};

type AddOptions = { variantId?: number | null; editionId?: number | null; quantity?: number; silent?: boolean };

type CartValue = {
  cart: Cart | null;
  loading: boolean;
  syncing: boolean;
  failed: boolean;
  count: number;
  promoCode: string | null;
  add: (productId: number, options?: AddOptions) => Promise<boolean>;
  setQuantity: (line: CartLine, quantity: number) => Promise<void>;
  remove: (line: CartLine) => Promise<void>;
  setSaved: (line: CartLine, saved: boolean) => Promise<void>;
  setSelected: (line: CartLine, selected: boolean) => Promise<void>;
  selectAll: (selected: boolean) => Promise<void>;
  moveAllSaved: () => Promise<void>;
  applyPromo: (code: string) => Promise<string | null>;
  removePromo: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CART_KEY = "apex_cart_v1";
const PROMO_KEY = "apex_promo_v1";

const CartContext = createContext<CartValue | null>(null);

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    if (value === null || (Array.isArray(value) && value.length === 0)) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode); the cart still works for this page view */
  }
}

const lineKey = (l: { product_id: number; variant_id: number | null; edition_id: number | null }) =>
  `${l.product_id}:${l.variant_id ?? 0}:${l.edition_id ?? 0}`;

function toGuestLines(cart: Cart): GuestLine[] {
  return [...cart.items, ...cart.saved].map((l) => ({
    product_id: l.product_id,
    variant_id: l.variant_id,
    edition_id: l.edition_id,
    quantity: l.quantity,
    saved_for_later: l.saved_for_later,
    selected: l.selected,
  }));
}

/** Merge duplicate guest lines (same product + options): quantities add up. */
function normalize(lines: GuestLine[]): GuestLine[] {
  const map = new Map<string, GuestLine>();
  for (const l of lines) {
    const k = lineKey(l);
    const existing = map.get(k);
    if (existing) existing.quantity = Math.min(existing.quantity + l.quantity, 30);
    else map.set(k, { ...l });
  }
  return [...map.values()];
}

/** Apply a change to a cart locally so the UI responds before the server does. */
function patchCart(cart: Cart, key: string, change: Partial<CartLine> | "remove"): Cart {
  const all = [...cart.items, ...cart.saved]
    .map((l) => {
      if (l.key !== key) return l;
      if (change === "remove") return null;
      const next = { ...l, ...change };
      next.line_total_cents = next.unit_price_cents * next.quantity;
      return next;
    })
    .filter((l): l is CartLine => l !== null);
  return { ...cart, items: all.filter((l) => !l.saved_for_later), saved: all.filter((l) => l.saved_for_later) };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const promoRef = useRef<string | null>(null);
  const cartRef = useRef<Cart | null>(null);

  const setCartBoth = useCallback((c: Cart | null) => {
    cartRef.current = c;
    setCart(c);
  }, []);

  const promoQuery = () => (promoRef.current ? `?promo=${encodeURIComponent(promoRef.current)}` : "");

  // Which user the latest load was for; results for anyone else are stale and dropped.
  const userIdRef = useRef<number | null>(userId);
  const generation = useRef(0);
  const mergeInFlight = useRef<Promise<Cart> | null>(null);

  const priceGuest = useCallback(async (lines: GuestLine[]): Promise<Cart> => {
    const body = (items: GuestLine[]) => ({ method: "POST", body: { items, promo: promoRef.current } });
    const priced = await api<Cart>("/cart/price", body(lines));
    // Store what the server resolved (default color/edition), merging duplicates,
    // unless the visitor signed in while this request was in flight.
    const resolved = normalize(toGuestLines(priced));
    if (userIdRef.current === null) writeLocal(CART_KEY, resolved);
    return resolved.length !== priced.items.length + priced.saved.length
      ? api<Cart>("/cart/price", body(resolved))
      : priced;
  }, []);

  const load = useCallback(async () => {
    userIdRef.current = userId;
    const gen = ++generation.current;
    try {
      let next: Cart;
      if (userId === null) {
        next = await priceGuest(readLocal<GuestLine[]>(CART_KEY, []));
      } else {
        const guest = readLocal<GuestLine[]>(CART_KEY, []);
        if (guest.length) {
          // One merge at a time, even if the effect runs twice.
          mergeInFlight.current ??= api<Cart>(`/cart/merge${promoQuery()}`, {
            method: "POST",
            body: { items: guest },
          }).finally(() => {
            mergeInFlight.current = null;
          });
          next = await mergeInFlight.current;
          writeLocal(CART_KEY, []);
        } else {
          next = await api<Cart>(`/cart${promoQuery()}`);
        }
      }
      if (gen !== generation.current) return;
      setCartBoth(next);
      setFailed(false);
    } catch {
      if (gen === generation.current) setFailed(true);
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [userId, priceGuest, setCartBoth]);

  useEffect(() => {
    promoRef.current = readLocal<string | null>(PROMO_KEY, null);
    void (async () => {
      setPromoCode(promoRef.current);
      // Signing in or out swaps the whole cart; show loading instead of the old one.
      if (userIdRef.current !== userId) setLoading(true);
      await load();
    })();
  }, [load, userId]);

  /** Run a mutation with an optimistic local update and rollback on failure. */
  const mutate = useCallback(
    async (optimistic: ((c: Cart) => Cart) | null, run: () => Promise<Cart>): Promise<boolean> => {
      const before = cartRef.current;
      if (optimistic && before) setCartBoth(optimistic(before));
      setSyncing(true);
      try {
        setCartBoth(await run());
        setFailed(false);
        return true;
      } catch (e) {
        setCartBoth(before);
        notify({ kind: "error", message: errorMessage(e) });
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [notify, setCartBoth],
  );

  const guestRun = useCallback(
    (edit: (lines: GuestLine[]) => GuestLine[]) => () => {
      const before = readLocal<GuestLine[]>(CART_KEY, []);
      const lines = edit(before);
      writeLocal(CART_KEY, lines);
      return priceGuest(lines).catch((e) => {
        writeLocal(CART_KEY, before);
        throw e;
      });
    },
    [priceGuest],
  );

  const add = useCallback(
    async (productId: number, options: AddOptions = {}) => {
      const body = {
        product_id: productId,
        variant_id: options.variantId ?? null,
        edition_id: options.editionId ?? null,
        quantity: options.quantity ?? 1,
      };
      const ok = await mutate(
        null,
        userId !== null
          ? () => api<Cart>(`/cart/items${promoQuery()}`, { method: "POST", body })
          : guestRun((lines) => [...lines, { ...body, saved_for_later: false, selected: true }]),
      );
      if (ok && !options.silent) {
        notify({ kind: "success", message: "Added to cart", action: { label: "View cart", href: "/cart" } });
      }
      return ok;
    },
    [mutate, userId, guestRun, notify],
  );

  const update = useCallback(
    async (line: CartLine, change: Partial<CartLine>, serverBody: Partial<GuestLine>) => {
      await mutate(
        (c) => patchCart(c, line.key, change),
        userId !== null && line.id !== null
          ? () => api<Cart>(`/cart/items/${line.id}${promoQuery()}`, { method: "PATCH", body: serverBody })
          : guestRun((lines) => lines.map((l) => (lineKey(l) === line.key ? { ...l, ...serverBody } : l))),
      );
    },
    [mutate, userId, guestRun],
  );

  const remove = useCallback(
    async (line: CartLine) => {
      await mutate(
        (c) => patchCart(c, line.key, "remove"),
        userId !== null && line.id !== null
          ? () => api<Cart>(`/cart/items/${line.id}${promoQuery()}`, { method: "DELETE" })
          : guestRun((lines) => lines.filter((l) => lineKey(l) !== line.key)),
      );
    },
    [mutate, userId, guestRun],
  );

  const selectAll = useCallback(
    async (selected: boolean) => {
      await mutate(
        (c) => ({ ...c, items: c.items.map((l) => ({ ...l, selected })) }),
        userId !== null
          ? () => api<Cart>(`/cart/select-all${promoQuery()}`, { method: "POST", body: { selected } })
          : guestRun((lines) => lines.map((l) => (l.saved_for_later ? l : { ...l, selected }))),
      );
    },
    [mutate, userId, guestRun],
  );

  const moveAllSaved = useCallback(async () => {
    await mutate(
      (c) => ({
        ...c,
        items: [...c.items, ...c.saved.map((l) => ({ ...l, saved_for_later: false, selected: true }))],
        saved: [],
      }),
      userId !== null
        ? () => api<Cart>(`/cart/saved/move-all${promoQuery()}`, { method: "POST" })
        : guestRun((lines) => lines.map((l) => ({ ...l, saved_for_later: false, selected: true }))),
    );
  }, [mutate, userId, guestRun]);

  const applyPromo = useCallback(
    async (code: string) => {
      const clean = code.trim().toUpperCase();
      if (!clean) return "Enter a promo code.";
      try {
        await api("/cart/promo", { method: "POST", body: { code: clean } });
      } catch (e) {
        return errorMessage(e);
      }
      promoRef.current = clean;
      writeLocal(PROMO_KEY, clean);
      setPromoCode(clean);
      await load();
      return null;
    },
    [load],
  );

  const removePromo = useCallback(async () => {
    promoRef.current = null;
    writeLocal(PROMO_KEY, null);
    setPromoCode(null);
    await load();
  }, [load]);

  const value = useMemo<CartValue>(
    () => ({
      cart,
      loading,
      syncing,
      failed,
      promoCode,
      count: cart ? cart.items.reduce((n, l) => n + l.quantity, 0) : 0,
      add,
      setQuantity: (line, quantity) => update(line, { quantity }, { quantity }),
      setSaved: (line, saved) =>
        update(line, { saved_for_later: saved, selected: true }, saved ? { saved_for_later: true } : { saved_for_later: false, selected: true }),
      setSelected: (line, selected) => update(line, { selected }, { selected }),
      remove,
      selectAll,
      moveAllSaved,
      applyPromo,
      removePromo,
      refresh: load,
    }),
    [cart, loading, syncing, failed, promoCode, add, update, remove, selectAll, moveAllSaved, applyPromo, removePromo, load],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
