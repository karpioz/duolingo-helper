"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DayActivity } from "@/server/stats";

const CELL = 11;
const GAP = 3;
const LEVEL_COLORS = ["var(--viz-empty)", "var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)"];
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

type Cell = { day: string; answers: number; correct: number; level: number; col: number; row: number };

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6. */
function weekday(day: string) {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Level 0 = no answers; 1–4 split the busiest day's count into quarters. */
function levelFor(answers: number, max: number) {
  if (answers <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((answers / max) * 4)));
}

/** GitHub-style calendar of answers per day over the last year (weeks start on Monday). */
export function ActivityCalendar({ activity, today }: { activity: DayActivity[]; today: string }) {
  const byDay = new Map(activity.map((a) => [a.day, a]));
  const max = Math.max(0, ...activity.map((a) => a.answers));

  const yearAgo = addDays(today, -364);
  const start = addDays(yearAgo, -weekday(yearAgo));
  const cells: Cell[] = [];
  for (let day = start, i = 0; day <= today; day = addDays(day, 1), i++) {
    const a = byDay.get(day);
    const answers = a?.answers ?? 0;
    cells.push({ day, answers, correct: a?.correct ?? 0, level: levelFor(answers, max), col: Math.floor(i / 7), row: i % 7 });
  }
  const weeks = cells.at(-1)!.col + 1;

  // Month label above the first week that contains the 1st of that month.
  const months: { col: number; label: string }[] = [];
  for (const c of cells) {
    if (c.day.endsWith("-01")) {
      const label = new Date(`${c.day}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
      if (!months.length || c.col - months.at(-1)!.col >= 3) months.push({ col: c.col, label });
    }
  }

  const inWindow = cells.filter((c) => c.day >= yearAgo);
  const total = inWindow.reduce((n, c) => n + c.answers, 0);
  const activeDays = inWindow.filter((c) => c.answers > 0);

  const [hover, setHover] = useState<{ cell: Cell; left: number; top: number; size: number; width: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // On narrow screens, start scrolled to the most recent weeks.
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  function onEnter(cell: Cell, el: HTMLElement) {
    const grid = el.offsetParent as HTMLElement | null;
    setHover({ cell, left: el.offsetLeft, top: el.offsetTop, size: el.offsetWidth, width: grid?.offsetWidth ?? 0 });
  }

  const h = hover?.cell;
  const pct = h && h.answers ? Math.round((h.correct / h.answers) * 100) : 0;
  // Keep the tooltip inside the scroll container: below the cell on top rows, inward at the edges.
  const nearLeft = hover ? hover.left < 120 : false;
  const nearRight = hover ? hover.width - hover.left < 120 : false;

  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-medium">
        {total.toLocaleString()} answers in the last year
        <span className="font-normal text-muted-foreground"> · {activeDays.length} active days</span>
      </figcaption>

      <div ref={scroller} className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={`Activity calendar: ${total} answers on ${activeDays.length} days in the last year`}
          className="relative grid min-w-[36rem]"
          style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))`, gap: GAP }}
          onMouseLeave={() => setHover(null)}
        >
          {months.map((m) => (
            <span
              key={m.col}
              className="text-[10px] leading-4 whitespace-nowrap text-muted-foreground"
              style={{ gridRow: 1, gridColumn: `${m.col + 2} / span 4` }}
            >
              {m.label}
            </span>
          ))}
          {WEEKDAY_LABELS.map((l, i) => (
            <span
              key={i}
              className="self-center pr-1 text-[10px] leading-none text-muted-foreground"
              style={{ gridRow: i + 2, gridColumn: 1 }}
            >
              {l}
            </span>
          ))}
          {cells.map((c) => (
            <div
              key={c.day}
              onMouseEnter={(e) => onEnter(c, e.currentTarget)}
              className="aspect-square rounded-[2px] outline-offset-1 hover:outline hover:outline-foreground/40"
              style={{
                gridColumn: c.col + 2,
                gridRow: c.row + 2,
                background: LEVEL_COLORS[c.level],
                opacity: c.day < yearAgo ? 0.4 : 1,
              }}
            />
          ))}

          {hover && h && (
            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute z-10 rounded-md bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-md",
                h.row < 3 ? "" : "-translate-y-full",
                nearLeft ? "" : nearRight ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{
                left: hover.left + (nearLeft ? 0 : nearRight ? hover.size : hover.size / 2),
                top: h.row < 3 ? hover.top + hover.size + 4 : hover.top - 4,
              }}
            >
              <div className="font-medium">
                {h.answers ? `${h.answers} answer${h.answers === 1 ? "" : "s"} · ${pct}% correct` : "No practice"}
              </div>
              <div className="opacity-70">{formatDay(h.day)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        <span className="mr-1">Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <span key={i} className="rounded-[3px]" style={{ width: CELL, height: CELL, background: color }} />
        ))}
        <span className="ml-1">More</span>
      </div>

      {activeDays.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
          <table className="mt-2 w-full max-w-sm text-left tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Day</th>
                <th className="py-1 text-right font-normal">Answers</th>
                <th className="py-1 text-right font-normal">Correct</th>
              </tr>
            </thead>
            <tbody>
              {[...activeDays].reverse().map((c) => (
                <tr key={c.day} className="border-t">
                  <td className="py-1">{formatDay(c.day)}</td>
                  <td className="py-1 text-right">{c.answers}</td>
                  <td className="py-1 text-right">{Math.round((c.correct / c.answers) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
