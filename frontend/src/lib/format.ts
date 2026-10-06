import type { DeliverySpeed } from "@/types/api";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(cents: number): string {
  return usd.format(cents / 100);
}

/** "$119" and "99" for the big-dollars/small-cents price style in the designs. */
export function priceParts(cents: number): { dollars: string; cents: string } {
  const [d, c] = usd.format(cents / 100).split(".");
  return { dollars: d, cents: c ?? "00" };
}

export function discountPct(price: number, list: number | null): number {
  if (!list || list <= price) return 0;
  return Math.round(((list - price) * 100) / list);
}

export function compactCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function boughtLabel(n: number): string | null {
  if (n < 50) return null;
  if (n >= 1000) return `${Math.floor(n / 1000)}K+ bought in past month`;
  return `${Math.floor(n / 50) * 50}+ bought in past month`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDay(date: Date): string {
  return dayFmt.format(date);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const deliveryDays: Record<DeliverySpeed, number> = { one_day: 1, two_day: 2, standard: 4 };

export const deliveryLabel: Record<DeliverySpeed, string> = {
  one_day: "One-Day",
  two_day: "FREE 2-Day",
  standard: "FREE Delivery",
};
