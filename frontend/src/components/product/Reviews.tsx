"use client";

import { BadgeCheck, Search, Star, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, errorMessage } from "@/lib/api-client";
import { compactCount, formatDate } from "@/lib/format";
import type { Review, ReviewPage } from "@/types/api";

const VOTED_KEY = "apex_helpful_v1";

function readVoted(): number[] {
  try {
    return JSON.parse(window.localStorage.getItem(VOTED_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: (r: Review) => void }) {
  const uid = useId();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Pick a star rating.");
    if (title.trim().length < 3) return setError("Give your review a title (at least 3 characters).");
    if (body.trim().length < 10) return setError("Write at least 10 characters about the product.");
    setBusy(true);
    setError(null);
    try {
      onDone(await api<Review>(`/products/${slug}/reviews`, { method: "POST", body: { rating, title, body } }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
      <fieldset>
        <legend className="mb-1 text-sm font-bold">Overall rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="grid size-11 place-items-center rounded-control hover:bg-surface-tint"
            >
              <Star aria-hidden="true" className={`size-7 ${n <= rating ? "fill-star text-star" : "text-line"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${uid}-t`} className="block text-sm font-bold">
        Title
      </label>
      <input
        id={`${uid}-t`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="h-11 w-full rounded-control border border-line px-3 text-base outline-none focus:border-primary"
      />
      <label htmlFor={`${uid}-b`} className="block text-sm font-bold">
        Your review
      </label>
      <textarea
        id={`${uid}-b`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={4000}
        className="w-full rounded-control border border-line p-3 text-base outline-none focus:border-primary"
      />
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Button type="submit" loading={busy}>
        Submit review
      </Button>
    </form>
  );
}

export function Reviews({ slug, initial }: { slug: string; initial: ReviewPage }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [data, setData] = useState(initial);
  const [items, setItems] = useState(initial.items);
  const [stars, setStars] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("helpful");
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [voted, setVoted] = useState<number[]>([]);

  async function load(next: { stars?: number | null; q?: string; sort?: string; page?: number }) {
    const s = next.stars !== undefined ? next.stars : stars;
    const q = next.q ?? query;
    const so = next.sort ?? sort;
    const page = next.page ?? 1;
    const params = new URLSearchParams({ page: String(page), sort: so });
    if (s) params.set("stars", String(s));
    if (q.trim()) params.set("q", q.trim());
    setLoading(true);
    try {
      const res = await api<ReviewPage>(`/products/${slug}/reviews?${params}`);
      setData(res);
      setItems((prev) => (page > 1 ? [...prev, ...res.items] : res.items));
    } catch (e) {
      notify({ kind: "error", message: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  async function helpful(r: Review) {
    const already = readVoted();
    if (already.includes(r.id)) return;
    try {
      await api(`/reviews/${r.id}/helpful`, { method: "POST" });
      const next = [...already, r.id];
      window.localStorage.setItem(VOTED_KEY, JSON.stringify(next));
      setVoted(next);
      setItems((all) => all.map((x) => (x.id === r.id ? { ...x, helpful_count: x.helpful_count + 1 } : x)));
    } catch (e) {
      notify({ kind: "error", message: errorMessage(e) });
    }
  }

  const s = data.summary;
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="grid gap-8 rounded-card bg-surface p-5 shadow-card sm:p-6 lg:grid-cols-[20rem_1fr]">
      <div>
        <h2 id="reviews-title" className="text-xl font-extrabold tracking-tight">
          Customer Reviews
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-5xl font-extrabold">{s.rating_avg.toFixed(1)}</span>
          <span>
            <StarRating rating={s.rating_avg} size="md" showValue={false} />
            <span className="block text-sm text-ink-muted">{compactCount(s.rating_count)} global ratings</span>
          </span>
        </div>
        <ul className="mt-5 space-y-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const pct = s.breakdown_pct[String(n)] ?? 0;
            const active = stars === n;
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => {
                    const v = active ? null : n;
                    setStars(v);
                    void load({ stars: v });
                  }}
                  aria-pressed={active}
                  aria-label={`${n} star: ${pct}% of ratings. Show these reviews.`}
                  className={`grid min-h-11 w-full grid-cols-[3rem_1fr_2.5rem] sm:min-h-9 items-center gap-2 rounded-control px-1 text-sm hover:bg-surface-tint ${
                    active ? "bg-surface-tint font-bold" : ""
                  }`}
                >
                  <span className="text-left text-accent-text">{n} star</span>
                  <span className="h-3 overflow-hidden rounded-pill bg-surface-tint-3">
                    <span className="block h-full rounded-pill bg-primary" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-right text-ink-muted tabular-nums">{pct}%</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-base font-bold">Review this product</h3>
          <p className="mt-1 text-sm text-ink-muted">Share your experience with other Apex shoppers.</p>
          {!user ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/product/${slug}#reviews`)}`}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-surface-tint-2 text-sm font-bold hover:bg-surface-tint-3"
            >
              Sign in to write a review
            </Link>
          ) : data.can_review ? (
            writing ? (
              <ReviewForm
                slug={slug}
                onDone={(r) => {
                  setItems((all) => [r, ...all]);
                  setData((d) => ({ ...d, can_review: false }));
                  setWriting(false);
                  notify({ kind: "success", message: "Thanks! Your review is live." });
                }}
              />
            ) : (
              <Button variant="secondary" className="mt-3 w-full" onClick={() => setWriting(true)}>
                Write a customer review
              </Button>
            )
          ) : (
            <p className="mt-3 rounded-control bg-surface-tint p-3 text-sm text-ink-muted">
              You can review products you&apos;ve bought. Reviews are limited to one per product.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              void load({ q: query });
            }}
          >
            <label className="sr-only" htmlFor="review-search">
              Search reviews
            </label>
            <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="review-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reviews: battery, comfort, noise..."
              className="h-11 w-full rounded-control border border-line pr-3 pl-9 text-base outline-none focus:border-primary sm:text-sm"
            />
          </form>
          <select
            aria-label="Sort reviews"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              void load({ sort: e.target.value });
            }}
            className="h-11 rounded-control border border-line bg-surface px-3 text-sm font-semibold"
          >
            <option value="helpful">Top reviews</option>
            <option value="recent">Most recent</option>
          </select>
        </div>

        <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
          {data.total} {data.total === 1 ? "review" : "reviews"}
          {stars ? ` with ${stars} stars` : ""}
          {query.trim() && data.total >= 0 ? ` mentioning "${query.trim()}"` : ""}
        </p>

        <ul className={`mt-3 space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {items.length === 0 && (
            <li className="rounded-card bg-surface-tint p-6 text-center text-sm text-ink-muted">
              No reviews match yet. Try another star rating or search term.
            </li>
          )}
          {items.map((r) => {
            const didVote = voted.includes(r.id);
            return (
              <li key={r.id} className="rounded-card border border-line p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-pill bg-chrome text-xs font-bold text-on-chrome">
                    {initials(r.author)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{r.author}</p>
                    <p className="text-xs text-ink-muted">Reviewed on {formatDate(r.created_at)}</p>
                  </div>
                  {r.verified_purchase && (
                    <span className="flex items-center gap-1 text-xs font-bold text-accent-text">
                      <BadgeCheck aria-hidden="true" className="size-4" /> Verified Purchase
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StarRating rating={r.rating} showValue={false} />
                  <h4 className="text-base font-bold">{r.title}</h4>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{r.body}</p>
                <div className="mt-3 flex items-center gap-3 text-sm text-ink-muted">
                  <span>
                    {r.helpful_count} {r.helpful_count === 1 ? "person" : "people"} found this helpful
                  </span>
                  <button
                    type="button"
                    onClick={() => helpful(r)}
                    disabled={didVote}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line px-3 sm:min-h-9 font-semibold text-ink hover:bg-surface-tint disabled:opacity-60"
                  >
                    <ThumbsUp aria-hidden="true" className="size-3.5" />
                    {didVote ? "Thanks" : "Helpful"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {data.page < data.pages && (
          <Button variant="outline" className="mt-4 w-full" loading={loading} onClick={() => load({ page: data.page + 1 })}>
            Show more reviews
          </Button>
        )}
      </div>
    </section>
  );
}
