"use client";

import { useNow } from "@/hooks/useNow";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Live "05:42:10" countdown; renders a placeholder until mounted. */
export function Countdown({
  to,
  format = "clock",
  className = "",
}: {
  to: string;
  format?: "clock" | "words";
  className?: string;
}) {
  const now = useNow(1000);
  if (now === null) return <span className={className}>--:--:--</span>;
  const { h, m, s } = parts(new Date(to).getTime() - now);
  const text = format === "clock" ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${h}h ${pad(m)}m left`;
  return (
    <time className={`tabular-nums ${className}`} dateTime={to}>
      {text}
    </time>
  );
}

/** "3 hrs 12 mins" until the end of today (the order cutoff for next-day delivery). */
export function CutoffCountdown({ className = "" }: { className?: string }) {
  const now = useNow(30_000);
  if (now === null) return <span className={className}>today</span>;
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const { h, m } = parts(end.getTime() - now);
  return (
    <span className={`tabular-nums ${className}`}>
      {h} hrs {m} mins
    </span>
  );
}
