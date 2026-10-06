import { cookies } from "next/headers";

/**
 * Server-side calls to the FastAPI backend (server components, route handlers).
 * Uses API_URL directly; the browser never sees it. Never throws during render:
 * callers get a typed result and render an error state instead.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

type Options = {
  /** Forward the visitor's session cookie (for signed-in data). */
  auth?: boolean;
  /** Seconds to cache public data; omit for no caching. */
  revalidate?: number;
  method?: string;
  body?: unknown;
};

function baseUrl(): string | null {
  const url = process.env.API_URL;
  return url ? url.replace(/\/$/, "") : null;
}

export async function apiGet<T>(path: string, options: Options = {}): Promise<ApiResult<T>> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, status: 500, message: "API_URL is not configured." };
  }
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.auth) {
    const jar = await cookies();
    const cookie = jar.toString();
    if (cookie) headers.cookie = cookie;
  }
  if (options.body !== undefined) headers["content-type"] = "application/json";

  try {
    const res = await fetch(`${base}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(60_000),
      ...(options.revalidate !== undefined && !options.auth
        ? { next: { revalidate: options.revalidate } }
        : { cache: "no-store" as const }),
    });
    if (!res.ok) {
      let message = res.statusText || "Request failed";
      try {
        const body = (await res.json()) as { detail?: unknown };
        if (typeof body.detail === "string") message = body.detail;
      } catch {
        /* non-JSON error body */
      }
      return { ok: false, status: res.status, message };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503, message: "We couldn't reach the store right now." };
  }
}

/** Build a query string, skipping empty values and repeating array keys. */
export function toQuery(params: Record<string, string | string[] | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) value.forEach((v) => v && q.append(key, v));
    else q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
