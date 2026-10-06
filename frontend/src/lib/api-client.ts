/**
 * Browser-side calls. Always same-origin (/api/v1/...); Next.js forwards them to
 * the FastAPI service, so the session cookie stays first-party.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = "We couldn't reach the store. Check your connection and try again.";

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body === undefined ? { accept: "application/json" } : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : res.status >= 500
          ? "Something went wrong on our side. Please try again."
          : "That didn't work. Please try again.";
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : NETWORK_MESSAGE;
}
