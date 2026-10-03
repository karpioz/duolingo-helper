"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useTransition } from "react";
import { switchCourse } from "@/app/actions";
import { Flag } from "@/components/flag";
import { courseInfo } from "@/lib/courses";
import { cn } from "@/lib/utils";

/**
 * Header menu showing the current course ("🇪🇸 Spanish") and switching to another imported one.
 * A native <details> so it opens without JS and closes on choice.
 */
export function CourseSwitcher({ current, courses }: { current: string; courses: { id: string; words: number }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [pending, startTransition] = useTransition();
  const info = courseInfo(current);

  function choose(id: string) {
    if (ref.current) ref.current.open = false;
    if (id !== current) startTransition(() => switchCourse(id));
  }

  return (
    <details ref={ref} className="group relative">
      <summary
        className={cn(
          "flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border px-2 text-sm font-medium select-none hover:bg-muted [&::-webkit-details-marker]:hidden",
          pending && "opacity-60",
        )}
        aria-label={`Course: ${info.learning.name} from ${info.from.name}. Change course`}
      >
        <Flag code={info.learning.code} />
        <span className="hidden sm:inline">{info.learning.name}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
        <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">Your courses</p>
        {courses.map((c) => {
          const ci = courseInfo(c.id);
          const on = c.id === current;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c.id)}
              aria-pressed={on}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted", on && "bg-muted")}
            >
              <Flag code={ci.learning.code} className="text-base" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{ci.learning.name}</span>
                <span className="block text-xs text-muted-foreground">
                  from {ci.from.name} · {c.words.toLocaleString()} {c.words === 1 ? "word" : "words"}
                </span>
              </span>
              {on && <Check className="size-4" />}
            </button>
          );
        })}
        <Link
          href="/import"
          onClick={() => ref.current && (ref.current.open = false)}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <span className="flex h-[1em] w-[1.5em] items-center justify-center rounded-[2px] border border-dashed text-base">
            <Plus className="size-3" />
          </span>
          Import another course
        </Link>
      </div>
    </details>
  );
}
