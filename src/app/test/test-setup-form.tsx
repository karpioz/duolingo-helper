"use client";

import { useState, useTransition } from "react";
import { startExam } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TagWithCount } from "@/server/words";

type Source = "recent" | "alphabetical" | "random" | "tagged" | "missed";
type Direction = "source_to_target" | "target_to_source" | "mixed";
type Mode = "typed" | "match";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "typed", label: "Type answers", hint: "Write the translation" },
  { value: "match", label: "Match pairs", hint: "Pair Spanish and English tiles, 5 at a time" },
];

const COUNTS = [10, 20] as const;

const SOURCES: { value: Source; label: string; hint: string }[] = [
  { value: "recent", label: "Recently learned", hint: "Your newest Duolingo words" },
  { value: "alphabetical", label: "Alphabetical", hint: "In A–Z order" },
  { value: "random", label: "Random", hint: "Any words from your list" },
  { value: "tagged", label: "Tagged", hint: "Words you tagged hard or forgot" },
  { value: "missed", label: "Missed last time", hint: "Words you got wrong most recently" },
];

const DIRECTIONS: { value: Direction; label: string; matchLabel: string }[] = [
  { value: "source_to_target", label: "Spanish → English", matchLabel: "Spanish | English" },
  { value: "target_to_source", label: "English → Spanish", matchLabel: "English | Spanish" },
  { value: "mixed", label: "Mixed", matchLabel: "Mixed" },
];

export function TestSetupForm({
  totalWords,
  missedWords,
  tags,
}: {
  totalWords: number;
  missedWords: number;
  tags: TagWithCount[];
}) {
  const [mode, setMode] = useState<Mode>("typed");
  const [countChoice, setCountChoice] = useState<number | "custom">(10);
  const [customCount, setCustomCount] = useState("30");
  const [source, setSource] = useState<Source>("recent");
  const [tagIds, setTagIds] = useState<number[]>(() => tags.filter((t) => t.system).map((t) => t.id));
  const [startLetter, setStartLetter] = useState("");
  const [direction, setDirection] = useState<Direction>("source_to_target");
  const [lenient, setLenient] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = countChoice === "custom" ? Number(customCount) : countChoice;
  const available =
    source === "tagged"
      ? tags.filter((t) => tagIds.includes(t.id)).reduce((n, t) => n + t.words, 0)
      : source === "missed"
        ? missedWords
        : totalWords;
  const countValid = Number.isInteger(count) && count >= 1 && count <= 200;

  function submit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await startExam({ mode, count, source, direction, lenient, tagIds, startLetter });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      <Field label="Test type">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <OptionCard key={m.value} selected={mode === m.value} onClick={() => setMode(m.value)} label={m.label} hint={m.hint} />
          ))}
        </div>
      </Field>

      <Field label="How many words?">
        <div className="flex flex-wrap items-center gap-2">
          {COUNTS.map((n) => (
            <Choice key={n} selected={countChoice === n} onClick={() => setCountChoice(n)}>
              {n}
            </Choice>
          ))}
          <Choice selected={countChoice === "custom"} onClick={() => setCountChoice("custom")}>
            Custom
          </Choice>
          {countChoice === "custom" && (
            <Input
              type="number"
              min={1}
              max={200}
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
              className="w-24"
              aria-label="Custom number of words"
              autoFocus
            />
          )}
        </div>
      </Field>

      <Field label="Which words?">
        <div className="grid gap-2 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <OptionCard key={s.value} selected={source === s.value} onClick={() => setSource(s.value)} label={s.label} hint={s.hint} />
          ))}
        </div>
        {source === "tagged" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Choice
                key={t.id}
                selected={tagIds.includes(t.id)}
                onClick={() => setTagIds((ids) => (ids.includes(t.id) ? ids.filter((i) => i !== t.id) : [...ids, t.id]))}
              >
                {t.name} ({t.words})
              </Choice>
            ))}
          </div>
        )}
        {source === "alphabetical" && (
          <div className="mt-3 flex items-center gap-2">
            <Label htmlFor="startLetter" className="text-sm text-muted-foreground">
              Start from letter
            </Label>
            <Input
              id="startLetter"
              value={startLetter}
              maxLength={1}
              onChange={(e) => setStartLetter(e.target.value)}
              placeholder="a"
              className="w-14 text-center"
            />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{available.toLocaleString()} words available</p>
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

      <div className={cn("flex items-start gap-3", mode === "match" && "hidden")}>
        <Switch id="lenient" checked={lenient} onCheckedChange={setLenient} />
        <div className="space-y-0.5">
          <Label htmlFor="lenient">Lenient checking</Label>
          <p className="text-xs text-muted-foreground">Accept missing accents and small typos as “almost”.</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={pending || !countValid || available === 0} className="self-start">
        {pending ? "Starting…" : `Start test${countValid ? ` · ${Math.min(count, available)} words` : ""}`}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {children}
    </fieldset>
  );
}

function OptionCard({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
      )}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </button>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={onClick}>
      {children}
    </Button>
  );
}
