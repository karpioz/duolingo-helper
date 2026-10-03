"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitMatchBoard } from "@/app/actions";
import { playAudio } from "@/components/audio-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { tileFromKey, tileKey } from "@/lib/match";
import { cn } from "@/lib/utils";
import type { MatchBoard } from "@/server/exams";

type Column = "left" | "right";
type Tile = { column: Column; index: number };
type Flash = { id: number; kind: "correct" | "wrong"; tiles: Tile[] };

const CORRECT_MS = 350;
const WRONG_MS = 600;
const same = (a: Tile | null, b: Tile) => !!a && a.column === b.column && a.index === b.index;

export function MatchRunner({
  examId,
  boards,
  startBoard,
}: {
  examId: number;
  boards: MatchBoard[];
  startBoard: number;
}) {
  const router = useRouter();
  const [boardIndex, setBoardIndex] = useState(startBoard);
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [mistakes, setMistakes] = useState<Record<number, number>>({});
  // Refs mirror state for logic inside timers (state in closures would be stale).
  const matchedRef = useRef<Set<number>>(new Set());
  const mistakesRef = useRef<Record<number, number>>({});
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const flashId = useRef(0);
  const [status, setStatus] = useState<"playing" | "saving" | "error">("playing");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const startedAt = useRef(0);

  const board = boards[boardIndex];
  const spanishLeft = board.direction === "source_to_target";
  const pairAt = (t: Tile) => board.pairs[t.column === "left" ? t.index : board.rightOrder[t.index]];
  const labelOf = (t: Tile) => {
    const p = pairAt(t);
    return (t.column === "left") === spanishLeft ? p.spanish : p.english;
  };
  const isSpanish = (t: Tile) => (t.column === "left") === spanishLeft;

  useEffect(() => {
    startedAt.current = performance.now();
  }, [boardIndex]);

  function finishBoard(allMistakes: Record<number, number>) {
    setStatus("saving");
    const results = board.pairs.map((p) => ({ wordId: p.wordId, mistakes: allMistakes[p.wordId] ?? 0 }));
    const elapsed = Math.round(performance.now() - startedAt.current);
    startTransition(async () => {
      const res = await submitMatchBoard(examId, boardIndex, results, elapsed);
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return;
      }
      if (res.isLast) {
        router.push(`/test/${examId}/results`);
        return;
      }
      matchedRef.current = new Set();
      mistakesRef.current = {};
      setBoardIndex((i) => i + 1);
      setMatched(new Set());
      setMistakes({});
      setSelected(null);
      setFlashes([]);
      setStatus("playing");
    });
  }

  function select(tile: Tile) {
    if (status !== "playing") return;
    const pair = pairAt(tile);
    if (!pair || matchedRef.current.has(pair.wordId)) return;
    if (flashes.some((f) => f.tiles.some((t) => same(t, tile)))) return; // still animating

    if (isSpanish(tile)) playAudio(pair.audioUrl);

    if (!selected || selected.column === tile.column) {
      setSelected(same(selected, tile) ? null : tile);
      return;
    }

    const other = pairAt(selected);
    const id = ++flashId.current;
    const correct = other.wordId === pair.wordId;
    setSelected(null);
    setFlashes((fs) => [...fs, { id, kind: correct ? "correct" : "wrong", tiles: [selected, tile] }]);

    if (!correct) {
      const m = mistakesRef.current;
      mistakesRef.current = { ...m, [pair.wordId]: (m[pair.wordId] ?? 0) + 1, [other.wordId]: (m[other.wordId] ?? 0) + 1 };
      setMistakes(mistakesRef.current);
    }

    const timer = setTimeout(
      () => {
        timers.current.delete(timer);
        setFlashes((fs) => fs.filter((f) => f.id !== id));
        if (!correct) return;
        const next = new Set(matchedRef.current).add(pair.wordId);
        matchedRef.current = next;
        setMatched(next);
        if (next.size === board.pairs.length) finishBoard(mistakesRef.current);
      },
      correct ? CORRECT_MS : WRONG_MS,
    );
    timers.current.add(timer);
  }

  // Number keys: 1–5 select the left column, 6–9 and 0 the right column.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.target instanceof HTMLInputElement) return;
      const tile = tileFromKey(e.key, board.pairs.length);
      if (tile) {
        e.preventDefault();
        select(tile);
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const totalPairs = boards.reduce((n, b) => n + b.pairs.length, 0);
  const donePairs = boards.slice(0, boardIndex).reduce((n, b) => n + b.pairs.length, 0) + matched.size;
  const boardMistakes = Object.values(mistakes).reduce((a, b) => a + b, 0) / 2;

  function tileState(tile: Tile) {
    const pair = pairAt(tile);
    const f = flashes.findLast((x) => x.tiles.some((t) => same(t, tile)));
    if (f) return f.kind;
    if (matched.has(pair.wordId)) return "matched";
    if (same(selected, tile)) return "selected";
    return "idle";
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
          <span>
            Board {boardIndex + 1} of {boards.length}
          </span>
          <span>
            {donePairs}/{totalPairs} pairs
            {boardMistakes > 0 && ` · ${boardMistakes} mistake${boardMistakes === 1 ? "" : "s"}`}
          </span>
        </div>
        <Progress value={(donePairs / totalPairs) * 100} aria-label="Progress" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Select the matching pairs</h1>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-8">
        {(["left", "right"] as const).map((column) => (
          <div key={column} className="flex flex-col gap-3">
            {board.pairs.map((_, index) => {
              const tile = { column, index };
              const state = tileState(tile);
              return (
                <button
                  key={`${boardIndex}-${column}-${index}`}
                  type="button"
                  onClick={() => select(tile)}
                  disabled={state === "matched" || status !== "playing"}
                  lang={isSpanish(tile) ? "es" : "en"}
                  aria-pressed={state === "selected"}
                  className={cn(
                    "relative flex min-h-14 items-center justify-center rounded-xl border-2 border-b-4 px-12 py-2 text-center text-base transition-colors",
                    "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    state === "idle" && "bg-card hover:bg-muted",
                    state === "selected" && "border-sky-400 bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
                    state === "correct" && "border-green-500 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                    state === "wrong" && "animate-shake border-red-300 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300",
                    state === "matched" && "border-border/50 bg-transparent text-muted-foreground/40",
                  )}
                >
                  <kbd
                    className={cn(
                      "absolute left-3 flex size-7 items-center justify-center rounded-md border-2 font-mono text-xs",
                      state === "matched" ? "border-border/50" : "border-current/30 text-current opacity-70",
                    )}
                  >
                    {tileKey(column, index)}
                  </kbd>
                  {labelOf(tile)}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {status === "saving" && <p className="text-center text-sm text-muted-foreground">Saving…</p>}
      {status === "error" && (
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => finishBoard(mistakesRef.current)}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
