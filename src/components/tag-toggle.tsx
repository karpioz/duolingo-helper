"use client";

import { useState, useTransition } from "react";
import { toggleWordTag } from "@/app/actions";
import { cn } from "@/lib/utils";

export type TagInfo = { id: number; name: string; color: string | null };

/** A pill that tags/untags a word, updating optimistically. */
export function TagToggle({
  wordId,
  tag,
  on,
  onChange,
  shortcut,
}: {
  wordId: number;
  tag: TagInfo;
  on: boolean;
  /** Controlled mode: parent owns the state. */
  onChange?: (on: boolean) => void;
  /** Keyboard hint shown after the name, e.g. "H". */
  shortcut?: string;
}) {
  const [localOn, setLocalOn] = useState(on);
  const [, startTransition] = useTransition();
  const active = onChange ? on : localOn;

  function toggle() {
    const next = !active;
    if (onChange) onChange(next);
    else setLocalOn(next);
    startTransition(() => toggleWordTag(wordId, tag.id, next));
  }

  const color = tag.color ?? "currentColor";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        !active && "text-muted-foreground hover:text-foreground",
      )}
      style={active ? { background: color, borderColor: color, color: "white" } : { borderColor: "var(--border)" }}
    >
      {tag.name}
      {shortcut && <kbd className="font-mono text-[10px] opacity-60">{shortcut}</kbd>}
    </button>
  );
}
