"use client";

import { ArrowLeftRight, ArrowRight, Keyboard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";
import { courseInfo, directionLabels, type ExamDirection } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { DeleteTestButton, StartTestButton } from "./test-actions";

type RunMode = "typed" | "match";

const MODE_LABELS = { typed: "Type answers", choice: "Multiple choice", match: "Match pairs" } as const;

export type TestRowData = {
  id: number;
  name: string;
  mode: "typed" | "choice" | "match";
  direction: ExamDirection;
  words: number;
  /** Preformatted on the server ("4 Oct"), so the client renders the same text. */
  lastRun: { id: number; correct: number; size: number; date: string; mode: "typed" | "choice" | "match" } | null;
};

/** Two tiles side by side: the match pairs icon. */
function PairsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <rect x="2.5" y="6" width="8" height="12" rx="2" />
      <rect x="13.5" y="6" width="8" height="12" rx="2" />
    </svg>
  );
}

/** A pill that toggles one run setting; teal while it differs from the saved test. */
function RunPill({
  changed,
  className,
  ...props
}: React.ComponentProps<"button"> & { changed: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
        changed ? "border-teal bg-teal-soft text-teal ring-1 ring-teal" : "bg-card text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

/**
 * One row of My tests. The type and direction pills change the next run only: Start uses them,
 * the saved test keeps its own (Edit changes those).
 */
export function TestRow({ test, course }: { test: TestRowData; course: string }) {
  const savedMode: RunMode = test.mode === "match" ? "match" : "typed";
  const [mode, setMode] = useState<RunMode>(savedMode);
  const [direction, setDirection] = useState<ExamDirection>(test.direction);

  const { learning, from } = courseInfo(course);
  const labels = directionLabels(courseInfo(course));
  // Swap the two ways round; "mixed" is only offered when the test was saved that way.
  const directions: ExamDirection[] =
    test.direction === "mixed" ? ["mixed", "source_to_target", "target_to_source"] : ["source_to_target", "target_to_source"];
  const nextDirection = directions[(directions.indexOf(direction) + 1) % directions.length];
  const [first, second] = direction === "target_to_source" ? [from, learning] : [learning, from];
  const directionText = mode === "match" ? labels.columns[direction] : labels[direction];
  const canMatch = test.words >= 2;
  const modeChanged = mode !== test.mode;
  const directionChanged = direction !== test.direction;
  const onlyThisRun = "Just for this run. Edit the test to change it for good.";

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div>
          <Link href={`/test/personal/${test.id}`} className="font-medium hover:underline">
            {test.name}
          </Link>
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {" "}
            · {test.words} {test.words === 1 ? "word" : "words"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <RunPill
            changed={modeChanged}
            disabled={!canMatch && mode === "typed"}
            onClick={() => setMode(mode === "typed" ? "match" : "typed")}
            aria-label={`Type: ${MODE_LABELS[mode]}. Switch to ${MODE_LABELS[mode === "typed" ? "match" : "typed"]}`}
            title={modeChanged ? onlyThisRun : canMatch || mode === "match" ? "Switch type" : "Match pairs needs at least 2 words"}
          >
            {mode === "match" ? <PairsIcon /> : <Keyboard />}
            {MODE_LABELS[mode]}
          </RunPill>
          <RunPill
            changed={directionChanged}
            onClick={() => setDirection(nextDirection)}
            aria-label={`Direction: ${directionText}. Switch to ${mode === "match" ? labels.columns[nextDirection] : labels[nextDirection]}`}
            title={directionChanged ? onlyThisRun : "Switch direction"}
          >
            {direction === "mixed" ? (
              "Mixed"
            ) : (
              <>
                <Flag code={first.code} className="h-3 w-[18px]" />
                {first.name}
                {mode === "match" ? <span className="text-muted-foreground">|</span> : <ArrowRight />}
                <Flag code={second.code} className="h-3 w-[18px]" />
                {second.name}
              </>
            )}
            <ArrowLeftRight className={cn("ml-0.5", directionChanged ? "text-teal" : "text-muted-foreground")} />
          </RunPill>
        </div>
        {test.lastRun && (
          <Link href={`/test/${test.lastRun.id}/results`} className="text-xs text-muted-foreground hover:underline">
            Last run {test.lastRun.date} · {MODE_LABELS[test.lastRun.mode]}:{" "}
            <span className="tabular-nums">
              {test.lastRun.correct}/{test.lastRun.size} · {Math.round((test.lastRun.correct / test.lastRun.size) * 100)}%
            </span>
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StartTestButton
          id={test.id}
          disabled={test.words === 0}
          overrides={{ mode: modeChanged ? mode : undefined, direction: directionChanged ? direction : undefined }}
        />
        <Button variant="outline" nativeButton={false} render={<Link href={`/test/personal/${test.id}`} />}>
          Edit
        </Button>
        <DeleteTestButton id={test.id} name={test.name} />
      </div>
    </li>
  );
}
