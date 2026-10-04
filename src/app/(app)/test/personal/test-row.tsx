"use client";

import { ArrowLeftRight, ArrowRight, Keyboard, ListChecks, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Flag } from "@/components/flag";
import { courseInfo, directionLabels, type ExamDirection } from "@/lib/courses";
import { cn } from "@/lib/utils";
import { DeleteTestButton, StartTestButton } from "./test-actions";

type Mode = "typed" | "choice" | "match";

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

function ModeIcon({ mode, className }: { mode: TestRowData["mode"]; className?: string }) {
  if (mode === "match") return <PairsIcon className={className} />;
  if (mode === "choice") return <ListChecks className={className} aria-hidden />;
  return <Keyboard className={className} aria-hidden />;
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
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
        changed ? "bg-teal-soft text-teal ring-1 ring-teal" : "bg-muted/70 text-foreground/80 hover:bg-muted",
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
  const [mode, setMode] = useState<Mode>(test.mode);
  const [direction, setDirection] = useState<ExamDirection>(test.direction);

  const { learning, from } = courseInfo(course);
  const labels = directionLabels(courseInfo(course));
  // Swap the two ways round; "mixed" is only offered when the test was saved that way.
  const directions: ExamDirection[] =
    test.direction === "mixed" ? ["mixed", "source_to_target", "target_to_source"] : ["source_to_target", "target_to_source"];
  const nextDirection = directions[(directions.indexOf(direction) + 1) % directions.length];
  const [first, second] = direction === "target_to_source" ? [from, learning] : [learning, from];
  const directionText = (d: ExamDirection) => (mode === "match" ? labels.columns[d] : labels[d]);
  // Type answers ⇄ match pairs; multiple choice is only offered when the test was saved that way.
  const modes: Mode[] = test.mode === "choice" ? ["choice", "typed", "match"] : ["typed", "match"];
  const canMatch = test.words >= 2;
  const nextMode = (m: Mode): Mode => {
    const next = modes[(modes.indexOf(m) + 1) % modes.length];
    return next === "match" && !canMatch ? nextMode(next) : next;
  };
  const otherMode = nextMode(mode);
  const modeChanged = mode !== test.mode;
  const directionChanged = direction !== test.direction;
  const onlyThisRun = "Just this run. Edit the test to keep it.";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="min-w-0">
          <Link href={`/test/personal/${test.id}`} className="font-medium hover:underline">
            {test.name}
          </Link>
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {" "}
            · {test.words} {test.words === 1 ? "word" : "words"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Tooltip
            label={
              otherMode === mode
                ? "Match pairs needs at least 2 words"
                : modeChanged
                  ? onlyThisRun
                  : `Switch to ${MODE_LABELS[otherMode]}`
            }
          >
            <RunPill
              changed={modeChanged}
              disabled={otherMode === mode}
              onClick={() => setMode(otherMode)}
              aria-label={`Type: ${MODE_LABELS[mode]}. Switch to ${MODE_LABELS[otherMode]}`}
            >
              <ModeIcon mode={mode} />
              {MODE_LABELS[mode]}
            </RunPill>
          </Tooltip>
          <Tooltip label={`${directionText(direction)}. ${directionChanged ? onlyThisRun : "Click to reverse."}`}>
            <RunPill
              changed={directionChanged}
              onClick={() => setDirection(nextDirection)}
              aria-label={`Direction: ${directionText(direction)}. Switch to ${directionText(nextDirection)}`}
            >
              {direction === "mixed" ? (
                "Mixed"
              ) : (
                <>
                  <Flag code={first.code} className="h-3 w-[18px] ring-0!" />
                  {mode === "match" ? <span className="text-muted-foreground">|</span> : <ArrowRight className="size-3!" />}
                  <Flag code={second.code} className="h-3 w-[18px] ring-0!" />
                </>
              )}
              <ArrowLeftRight className={cn(directionChanged ? "text-teal" : "text-muted-foreground")} />
            </RunPill>
          </Tooltip>
          {test.lastRun && (
            <Tooltip label={`Last run ${test.lastRun.date} as ${MODE_LABELS[test.lastRun.mode]}. Open results.`}>
              <Link
                href={`/test/${test.lastRun.id}/results`}
                className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums hover:text-foreground hover:underline"
              >
                <ModeIcon mode={test.lastRun.mode} className="size-3" />
                {test.lastRun.correct}/{test.lastRun.size} · {test.lastRun.date}
              </Link>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StartTestButton
          id={test.id}
          disabled={test.words === 0}
          label={`Start: ${MODE_LABELS[mode]} · ${directionText(direction)}`}
          overrides={{
            // Never "choice": that's only reachable as the test's own type, which needs no override.
            mode: modeChanged && mode !== "choice" ? mode : undefined,
            direction: directionChanged ? direction : undefined,
          }}
        />
        <Tooltip label="Edit test">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-saffron-soft text-foreground hover:bg-saffron-soft/80"
            aria-label={`Edit ${test.name}`}
            nativeButton={false}
            render={<Link href={`/test/personal/${test.id}`} />}
          >
            <Pencil />
          </Button>
        </Tooltip>
        <DeleteTestButton id={test.id} name={test.name} />
      </div>
    </li>
  );
}
