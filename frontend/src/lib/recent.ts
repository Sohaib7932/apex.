/** Recently viewed products, kept in this browser only (for "Keep shopping for"). */

export type RecentItem = { slug: string; title: string; image: string | null; price_cents: number; viewed_at: number };

const KEY = "apex_recent_v1";
const MAX = 8;

export function readRecent(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(item: Omit<RecentItem, "viewed_at">): void {
  try {
    const rest = readRecent().filter((r) => r.slug !== item.slug);
    window.localStorage.setItem(KEY, JSON.stringify([{ ...item, viewed_at: Date.now() }, ...rest].slice(0, MAX)));
  } catch {
    /* storage unavailable */
  }
}
