/**
 * Base URL for API calls.
 *
 * In the browser we call the same origin and Next.js proxies /api/* to the
 * FastAPI service (see next.config.ts), so cookies stay first-party. On the
 * server we call the API directly.
 */
export function apiUrl(path: string): string {
  const base = typeof window === "undefined" ? (process.env.API_URL ?? "http://localhost:8000") : "";
  return `${base}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}
