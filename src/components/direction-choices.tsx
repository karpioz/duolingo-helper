"use client";

import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { Flag } from "@/components/flag";
import { courseInfo, directionOptions, type ExamDirection } from "@/lib/courses";
import { cn } from "@/lib/utils";

/**
 * Direction picker as cards with flags ("🇪🇸 → 🇬🇧 Spanish → English"). Match pairs shows them
 * as columns ("Spanish | English").
 */
export function DirectionChoices({
  course,
  value,
  onChange,
  match,
}: {
  course: string;
  value: ExamDirection;
  onChange: (d: ExamDirection) => void;
  match?: boolean;
}) {
  const { learning, from } = courseInfo(course);
  const hints: Record<ExamDirection, string> = match
    ? {
        source_to_target: `${learning.name} on the left`,
        target_to_source: `${from.name} on the left`,
        mixed: "Either way, per board",
      }
    : {
        source_to_target: `See ${learning.name}, answer in ${from.name}`,
        target_to_source: `See ${from.name}, answer in ${learning.name}`,
        mixed: "Either way round, per question",
      };
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {directionOptions(course).map((d) => {
        const [first, second] = d.value === "target_to_source" ? [from, learning] : [learning, from];
        const selected = value === d.value;
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(d.value)}
            className={cn(
              "flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition-colors",
              selected ? "border-teal bg-teal-soft ring-1 ring-teal" : "bg-card hover:bg-muted",
            )}
          >
            {/* Fixed-size flags at the card's edges, the arrow centred between them. */}
            <span className="flex w-full items-center justify-between gap-2">
              <Flag code={first.code} className="h-8 w-12 rounded-[5px]" />
              {d.value === "mixed" ? (
                <ArrowLeftRight className={cn("size-5 shrink-0", selected ? "text-teal" : "text-muted-foreground")} aria-hidden />
              ) : (
                <ArrowRight className={cn("size-5 shrink-0", selected ? "text-teal" : "text-muted-foreground")} aria-hidden />
              )}
              <Flag code={second.code} className="h-8 w-12 rounded-[5px]" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{match ? d.matchLabel : d.label}</span>
              <span className="block text-xs text-muted-foreground">{hints[d.value]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
