"use client";

import { useState, useTransition } from "react";
import { setMainMeaning } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { displayAnswer } from "@/lib/answers";
import { pickLabel } from "@/lib/match";
import { cn } from "@/lib/utils";

export type MeaningWord = { id: number; text: string; translations: string[]; preferred: string | null };

/**
 * Picks a word's main meaning: the translation shown on match tiles and multiple choice options.
 * Clicking a translation makes it the main one; clicking the main one again goes back to the
 * automatic choice. Saves right away.
 *
 * - `inline`: the translations as a comma-separated line (Words page).
 * - `pills`: buttons with an explanation (test creator).
 */
export function MeaningPicker({
  word,
  variant,
  onChange,
}: {
  word: MeaningWord;
  variant: "inline" | "pills";
  onChange?: (preferred: string | null) => void;
}) {
  const [preferred, setPreferred] = useState(word.preferred);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();
  const label = pickLabel(word.translations, { spanish: word.text, preferred });
  const picked = !!preferred && preferred === label;

  function choose(t: string | null) {
    const before = preferred;
    setPreferred(t);
    setError(false);
    onChange?.(t);
    startTransition(async () => {
      const res = await setMainMeaning(word.id, t).catch(() => ({ ok: false }));
      if (!res.ok) {
        setPreferred(before);
        onChange?.(before);
        setError(true);
      }
    });
  }
  const toggle = (t: string) => choose(t === preferred ? null : t);
  const title = (t: string) =>
    t === label ? (picked ? "Main meaning (click to go back to automatic)" : "Chosen automatically (click to keep it)") : "Make this the main meaning";

  if (variant === "inline") {
    // One translation: nothing to choose.
    if (word.translations.length <= 1) return <span>{word.translations.map(displayAnswer).join(", ")}</span>;
    return (
      <span className={cn(error && "text-destructive")}>
        {word.translations.map((t, i) => (
          <span key={t}>
            {i > 0 && ", "}
            <button
              type="button"
              onClick={() => toggle(t)}
              title={title(t)}
              className={cn(
                "rounded-sm underline-offset-2 hover:text-foreground hover:underline",
                t === label && "font-medium text-foreground underline",
                t === label && !picked && "decoration-dotted",
              )}
            >
              {displayAnswer(t)}
            </button>
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {word.translations.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            aria-pressed={t === label}
            title={title(t)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-sm transition-colors",
              t === label
                ? picked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-dashed border-primary bg-background"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {displayAnswer(t)}
          </button>
        ))}
      </div>
      <p className={cn("flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground", error && "text-destructive")}>
        {error
          ? "Couldn't save the main meaning. Try again."
          : picked
            ? "Your pick: shown on match tiles and multiple choice options."
            : "Chosen automatically (dashed). Click a meaning to make it the main one."}
        {picked && (
          <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => choose(null)}>
            Back to automatic
          </Button>
        )}
      </p>
    </div>
  );
}
