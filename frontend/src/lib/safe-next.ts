/** Only allow same-site relative return paths ("/checkout"), never "//evil.com" or full URLs. */
export function safeNext(value: string | string[] | undefined | null, fallback = "/"): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  return v;
}
