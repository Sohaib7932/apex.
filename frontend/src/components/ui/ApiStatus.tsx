import { apiUrl } from "@/lib/api";

type Health = { status: string; database: string; database_latency_ms: number | null };

async function fetchHealth(): Promise<Health | null> {
  try {
    const res = await fetch(apiUrl("/health"), { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

/** Live check that the frontend can reach the API, and the API can reach Neon. */
export async function ApiStatus() {
  const health = await fetchHealth();
  const apiOk = health !== null;
  const dbOk = health?.database === "ok";

  const row = (label: string, ok: boolean, detail: string) => (
    <li className="flex items-center gap-2 text-sm">
      <span aria-hidden="true" className={`size-2.5 rounded-pill ${ok ? "bg-success" : "bg-danger"}`} />
      <span className="font-semibold">{label}:</span>
      <span className={ok ? "text-success" : "text-danger"}>{detail}</span>
    </li>
  );

  return (
    <ul className="inline-flex flex-col gap-1.5 rounded-card bg-surface p-4 shadow-card">
      {row("API", apiOk, apiOk ? "reachable" : "unreachable")}
      {row(
        "Database",
        dbOk,
        dbOk ? `connected (${health?.database_latency_ms} ms)` : apiOk ? "unreachable" : "unknown",
      )}
    </ul>
  );
}
