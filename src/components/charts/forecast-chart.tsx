"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Day = { day: string; reviews: number };

const PLOT_H = 120;

function label(day: string, i: number) {
  if (i === 0) return "Today";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

function longDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Reviews due per day for the next two weeks (today includes overdue). One series: no legend. */
export function ForecastChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.reviews));
  const peak = days.reduce((best, d, i) => (d.reviews > days[best].reviews ? i : best), 0);
  const total = days.reduce((n, d) => n + d.reviews, 0);

  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-medium">
        Review forecast <span className="font-normal text-muted-foreground">· {total} reviews in the next 2 weeks</span>
      </figcaption>

      <div className="relative" onMouseLeave={() => setActive(null)}>
        <div
          className="flex items-end gap-0.5 border-b"
          style={{ height: PLOT_H + 18 }}
          role="img"
          aria-label={`Reviews due: ${days.map((d, i) => `${label(d.day, i)} ${d.reviews}`).join(", ")}`}
        >
          {days.map((d, i) => {
            const h = d.reviews ? Math.max(4, (d.reviews / max) * PLOT_H) : 0;
            const showValue = d.reviews > 0 && (i === 0 || i === peak);
            return (
              <div
                key={d.day}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
                onMouseEnter={() => setActive(i)}
              >
                {showValue && <span className="mb-0.5 text-[11px] text-muted-foreground tabular-nums">{d.reviews}</span>}
                <div
                  className={cn("w-full max-w-7 rounded-t-[4px] transition-opacity", active !== null && active !== i && "opacity-60")}
                  style={{ height: h, background: "var(--viz-series-1)" }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex gap-0.5 text-[10px] text-muted-foreground">
          {days.map((d, i) => (
            <span key={d.day} className="flex-1 truncate text-center">
              {i === 0 || i % 2 === 0 ? label(d.day, i) : ""}
            </span>
          ))}
        </div>

        {active !== null && (
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none absolute top-0 z-10 rounded-md bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-md",
              active < 3 ? "" : active > days.length - 4 ? "-translate-x-full" : "-translate-x-1/2",
            )}
            style={{ left: `${((active + (active < 3 ? 0 : active > days.length - 4 ? 1 : 0.5)) / days.length) * 100}%` }}
          >
            <div className="font-medium tabular-nums">
              {days[active].reviews} review{days[active].reviews === 1 ? "" : "s"}
              {active === 0 ? " (incl. overdue)" : ""}
            </div>
            <div className="opacity-70">{longDate(days[active].day)}</div>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <table className="mt-2 w-full max-w-xs text-left tabular-nums">
          <tbody>
            {days.map((d, i) => (
              <tr key={d.day} className="border-t">
                <td className="py-1">{i === 0 ? "Today (incl. overdue)" : longDate(d.day)}</td>
                <td className="py-1 text-right">{d.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
