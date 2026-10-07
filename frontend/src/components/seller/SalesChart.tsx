"use client";

import { useState } from "react";

import { money } from "@/lib/format";

type Day = { date: string; revenue_cents: number };

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Round the axis max up to a clean number with 4 even steps (0 / 250 / 500 / ...). */
function niceScale(maxCents: number): { max: number; step: number } {
  const max = Math.max(maxCents / 100, 10);
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  return { max: step * 4 * 100, step: step * 100 };
}

const axisMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

/**
 * Daily revenue, last 30 days (zero-filled). Single series: one hue, no legend
 * (the title names it). Hover or focus a day for its value; the table below
 * gives the same numbers without relying on the chart.
 */
export function SalesChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const peak = days.reduce((best, d, i) => (d.revenue_cents > (days[best]?.revenue_cents ?? -1) ? i : best), 0);
  const { max, step } = niceScale(days[peak]?.revenue_cents ?? 0);
  const ticks = Array.from({ length: 5 }, (_, i) => i * step);
  const total = days.reduce((n, d) => n + d.revenue_cents, 0);
  const shown = active ?? null;

  return (
    <section aria-labelledby="sales-title" className="rounded-card bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="sales-title" className="text-lg font-extrabold">
          Daily revenue, last 30 days
        </h2>
        <p className="text-sm text-ink-muted">
          Total <span className="font-bold text-ink">{money(total)}</span>
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-6 grid h-56 place-items-center rounded-control bg-surface-tint text-center text-sm text-ink-muted">
          No sales in the last 30 days yet. Revenue per day appears here once orders come in.
        </p>
      ) : (
      <div className="mt-6 grid grid-cols-[3.25rem_1fr] gap-2" aria-hidden="true">
        {/* y-axis */}
        <div className="relative h-56">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2 text-xs text-ink-muted tabular-nums"
              style={{ bottom: `${(t / max) * 100}%` }}
            >
              {axisMoney(t)}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative h-56">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const h = (d.revenue_cents / max) * 100;
              return (
                <div
                  key={d.date}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  <div
                    className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${
                      shown !== null && shown !== i ? "opacity-40" : ""
                    } bg-chart`}
                    style={{ height: `${h}%`, minHeight: d.revenue_cents > 0 ? 2 : 0 }}
                  />
                  {i === peak && d.revenue_cents > 0 && shown === null && (
                    <span
                      className="absolute -translate-y-1 text-2xs font-bold whitespace-nowrap text-ink"
                      style={{ bottom: `${h}%` }}
                    >
                      {axisMoney(d.revenue_cents)}
                    </span>
                  )}
                  {shown === i && (
                    <div
                      className="pointer-events-none absolute z-10 -translate-y-2 rounded-control bg-chrome px-2.5 py-1.5 text-xs whitespace-nowrap text-on-chrome shadow-pop"
                      style={{ bottom: `${Math.min(h, 85)}%` }}
                    >
                      <p className="font-semibold">{fullDay.format(new Date(d.date))}</p>
                      <p className="text-on-chrome-muted">{money(d.revenue_cents)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* x-axis */}
        <div />
        <div className="flex gap-[2px] border-t border-line pt-1.5">
          {days.map((d, i) => (
            <span key={d.date} className="flex min-w-0 flex-1 justify-center text-2xs whitespace-nowrap text-ink-muted">
              {i % 7 === 0 && i <= days.length - 4 ? dayLabel.format(new Date(d.date)) : i === days.length - 1 ? "Today" : ""}
            </span>
          ))}
        </div>
      </div>

)}

      <details className="mt-4 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-accent-text">
          Show as a table
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-control border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Daily revenue for the last 30 days</caption>
            <thead className="sticky top-0 bg-surface-tint">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Day
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="px-3 py-1.5">{fullDay.format(new Date(d.date))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{money(d.revenue_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
