"use client";

import { Check, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { findWords, savePersonal } from "@/app/actions";
import { AudioButton } from "@/components/audio-button";
import { MeaningPicker } from "@/components/meaning-picker";
import { Choice, Field, OptionCard } from "@/components/option-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayAnswer } from "@/lib/answers";
import { labelOf } from "@/lib/match";
import { cn } from "@/lib/utils";
import type { PickedWord } from "@/server/personal-tests";

type Mode = "typed" | "match";
type Direction = "source_to_target" | "target_to_source" | "mixed";

const MAX_WORDS = 200;

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "typed", label: "Type answers", hint: "Write the translation" },
  { value: "match", label: "Match pairs", hint: "Pair Spanish and English tiles, 5 at a time" },
];

const DIRECTIONS: { value: Direction; label: string; matchLabel: string }[] = [
  { value: "source_to_target", label: "Spanish → English", matchLabel: "Spanish | English" },
  { value: "target_to_source", label: "English → Spanish", matchLabel: "English | Spanish" },
  { value: "mixed", label: "Mixed", matchLabel: "Mixed" },
];

export function PersonalTestForm({
  id,
  initial,
}: {
  /** Editing an existing test; omitted when creating one. */
  id?: number;
  initial?: { name: string; mode: Mode; direction: Direction; words: PickedWord[] };
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "typed");
  const [direction, setDirection] = useState<Direction>(initial?.direction ?? "source_to_target");
  const [picked, setPicked] = useState<PickedWord[]>(initial?.words ?? []);
  const [query, setQuery] = useState("");
  /** Search results and the query they're for (they lag behind typing). */
  const [search, setSearch] = useState<{ q: string; words: PickedWord[] } | null>(null);
  /** Word whose main meaning is being edited in the "In this test" panel. */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Debounced search; a newer query discards older responses.
  useEffect(() => {
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const found = await findWords(query);
        if (!stale) setSearch({ q: query, words: found });
      } catch {
        if (!stale) setSearch({ q: query, words: [] });
      }
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const results = search?.words ?? null;
  const searching = search?.q !== query;
  const found = results?.length ?? 0;
  const pickedIds = new Set(picked.map((w) => w.id));
  const full = picked.length >= MAX_WORDS;
  const unpickedResults = results?.filter((w) => !pickedIds.has(w.id)) ?? [];
  const tooFewForMatch = mode === "match" && picked.length === 1;
  const nameMissing = name.trim().length === 0;
  const canSave = !nameMissing && picked.length > 0 && !tooFewForMatch && !pending;

  const add = (words: PickedWord[]) =>
    setPicked((list) => {
      const have = new Set(list.map((w) => w.id));
      return [...list, ...words.filter((w) => !have.has(w.id))].slice(0, MAX_WORDS);
    });
  const remove = (wordId: number) => setPicked((list) => list.filter((w) => w.id !== wordId));
  const editing = picked.find((w) => w.id === editingId);
  /** Keeps the picked list and search results in step with a main meaning change. */
  const setPreferred = (wordId: number, preferred: string | null) => {
    const update = (w: PickedWord) => (w.id === wordId ? { ...w, preferred } : w);
    setPicked((list) => list.map(update));
    setSearch((s) => s && { ...s, words: s.words.map(update) });
  };

  function save(start: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await savePersonal({ name, mode, direction, wordIds: picked.map((w) => w.id) }, id ?? null, start);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) save(false);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="test-name">Name</Label>
        <Input
          id="test-name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Past tense verbs"
          autoFocus={!id}
          aria-invalid={nameMissing || undefined}
          className={cn(
            nameMissing &&
              "border-red-300 bg-red-50/60 focus-visible:border-red-400 focus-visible:ring-red-200 dark:border-red-400/50 dark:bg-red-950/20 dark:focus-visible:ring-red-900/50",
          )}
        />
        {nameMissing && picked.length > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400">Name the test to save it.</p>
        )}
      </div>

      <Field label="Test type">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <OptionCard key={m.value} selected={mode === m.value} onClick={() => setMode(m.value)} label={m.label} hint={m.hint} />
          ))}
        </div>
      </Field>

      <Field label={mode === "match" ? "Columns" : "Direction"}>
        <div className="flex flex-wrap gap-2">
          {DIRECTIONS.map((d) => (
            <Choice key={d.value} selected={direction === d.value} onClick={() => setDirection(d.value)}>
              {mode === "match" ? d.matchLabel : d.label}
            </Choice>
          ))}
        </div>
      </Field>

      <section className="space-y-3 rounded-xl border bg-muted/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">
            In this test · {picked.length}
            {full && <span className="font-normal text-muted-foreground"> (max {MAX_WORDS})</span>}
          </h2>
          {picked.length > 0 && (
            <Button type="button" variant="link" size="xs" className="px-0" onClick={() => setPicked([])}>
              Remove all
            </Button>
          )}
        </div>
        {picked.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">No words yet: search below and click a word to add it.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {picked.map((w) => (
              <li
                key={w.id}
                className={cn(
                  "flex items-center gap-1 rounded-full border bg-background py-0.5 pr-0.5 pl-1 text-sm",
                  w.id === editingId && "border-primary ring-1 ring-primary",
                )}
              >
                <button
                  type="button"
                  onClick={() => setEditingId((id) => (id === w.id ? null : w.id))}
                  aria-expanded={w.id === editingId}
                  title="Choose the meaning shown in tests"
                  className="rounded-full px-2 hover:underline"
                >
                  {w.text}
                  <span className="text-muted-foreground"> · {displayAnswer(labelOf(w))}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                  aria-label={`Remove ${w.text}`}
                  onClick={() => remove(w.id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {editing && (
          <div className="space-y-2 rounded-lg border bg-background p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm">
                Main meaning of <span className="font-medium">{editing.text}</span>
              </p>
              <Button type="button" variant="ghost" size="xs" onClick={() => setEditingId(null)}>
                Done
              </Button>
            </div>
            <MeaningPicker
              key={editing.id}
              word={editing}
              variant="pills"
              onChange={(preferred) => setPreferred(editing.id, preferred)}
            />
          </div>
        )}
        {picked.length > 0 && !editing && (
          <p className="text-xs text-muted-foreground">Click a word to choose which meaning tests show.</p>
        )}
        {tooFewForMatch && <p className="text-xs text-muted-foreground">Match pairs needs at least 2 words.</p>}
      </section>

      <Field label="Add words">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the top result instead of submitting the form.
              if (e.key === "Enter") {
                e.preventDefault();
                if (!searching && unpickedResults[0] && !full) add([unpickedResults[0]]);
              }
            }}
            placeholder="Search Spanish or English…"
            className="pl-8"
            aria-label="Search words"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {searching
              ? "Searching…"
              : query.trim()
                ? `${found === 20 ? "Top 20" : found} ${found === 1 ? "match" : "matches"} · Enter adds the first`
                : "Recently learned"}
          </span>
          {!searching && query.trim() && unpickedResults.length > 1 && (
            <Button type="button" variant="link" size="xs" disabled={full} onClick={() => add(unpickedResults)}>
              Add all {unpickedResults.length}
            </Button>
          )}
        </div>
        {results && results.length > 0 && (
          <ul className={cn("max-h-80 divide-y overflow-y-auto rounded-xl border", searching && "opacity-60")}>
            {results.map((w) => {
              const on = pickedIds.has(w.id);
              return (
                <li key={w.id}>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <AudioButton url={w.audioUrl} />
                    <button
                      type="button"
                      onClick={() => (on ? remove(w.id) : add([w]))}
                      disabled={!on && full}
                      aria-pressed={on}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-muted disabled:opacity-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{w.text}</div>
                        <div className="truncate text-sm text-muted-foreground">{w.translations.map(displayAnswer).join(", ")}</div>
                      </div>
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border",
                          on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {on ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!searching && results?.length === 0 && (
          <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">No words match.</p>
        )}
      </Field>


      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={!canSave}>
          {pending ? "Saving…" : id ? "Save changes" : "Save test"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={!canSave} onClick={() => save(true)}>
          Save and start
        </Button>
        <Button type="button" size="lg" variant="ghost" nativeButton={false} render={<Link href="/test/personal" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
