"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { describeExam } from "@/lib/exam-labels";
import { cn } from "@/lib/utils";
import type { TestScore } from "@/server/stats";

const H = 200;
const M = { top: 12, right: 16, bottom: 26, left: 40 };

function formatDate(iso: string) {
  return new Date(`${iso}:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Score (% correct) of each recent test, oldest → newest. One series: no legend. */
export function ScoreChart({ tests }: { tests: TestScore[] }) {
  const [active, setActive] = useState<number | null>(null);
  // Draw at the real pixel width so text and marks keep their size.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const points = tests.map((t, i) => {
    const pct = t.size ? (t.correct / t.size) * 100 : 0;
    const x = M.left + (tests.length === 1 ? plotW / 2 : (i / (tests.length - 1)) * plotW);
    const y = M.top + plotH - (pct / 100) * plotH;
    return { ...t, pct, x, y };
  });
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const hovered = active === null ? null : points[active];

  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">
        Score by test <span className="font-normal text-muted-foreground">· last {tests.length}</span>
      </figcaption>
      <div ref={box} className="relative" onMouseLeave={() => setActive(null)}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Score of each recent test">
          {[0, 50, 100].map((v) => {
            const y = M.top + plotH - (v / 100) * plotH;
            return (
              <g key={v}>
                <line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
                <text x={M.left - 8} y={y} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                  {v}%
                </text>
              </g>
            );
          })}
          {points.length > 0 && (
            <>
              <text x={points[0].x} y={H - 6} textAnchor={points.length === 1 ? "middle" : "start"} fontSize={11} fill="var(--muted-foreground)">
                {formatDate(points[0].startedAt)}
              </text>
              {points.length > 1 && (
                <text x={points.at(-1)!.x} y={H - 6} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                  {formatDate(points.at(-1)!.startedAt)}
                </text>
              )}
            </>
          )}
          {points.length > 1 && (
            <path d={path} fill="none" stroke="var(--viz-series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {hovered && (
            <line x1={hovered.x} x2={hovered.x} y1={M.top} y2={M.top + plotH} stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeWidth={1} />
          )}
          {points.map((p, i) => (
            <g key={p.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={active === i ? 6 : 4}
                fill="var(--viz-series-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
              {/* Larger invisible hit target */}
              <circle
                cx={p.x}
                cy={p.y}
                r={14}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                aria-label={`${formatDate(p.startedAt)}: ${p.correct} of ${p.size}`}
              />
            </g>
          ))}
        </svg>

        {hovered && (
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none absolute z-10 rounded-md bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-md",
              "-translate-y-full",
              hovered.x / W < 0.2 ? "" : hovered.x / W > 0.8 ? "-translate-x-full" : "-translate-x-1/2",
            )}
            style={{ left: hovered.x, top: hovered.y - 10 }}
          >
            <div className="font-medium tabular-nums">
              {hovered.correct}/{hovered.size} · {Math.round(hovered.pct)}%
            </div>
            <div className="opacity-70">{describeExam(hovered)}</div>
            <div className="opacity-70">
              {formatDate(hovered.startedAt)}, {hovered.startedAt.slice(11)}
            </div>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">Date</th>
              <th className="py-1 font-normal">Test</th>
              <th className="py-1 text-right font-normal">Score</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-1">
                  {formatDate(p.startedAt)} {p.startedAt.slice(11)}
                </td>
                <td className="py-1">
                  <Link className="hover:underline" href={`/test/${p.id}/results`}>
                    {describeExam(p)}
                  </Link>
                </td>
                <td className="py-1 text-right">
                  {p.correct}/{p.size} · {Math.round(p.pct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
