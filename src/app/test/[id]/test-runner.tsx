"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitAnswer, toggleWordTag } from "@/app/actions";
import { AudioButton, playAudio } from "@/components/audio-button";
import { TagToggle, type TagInfo } from "@/components/tag-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { displayAnswer } from "@/lib/answers";
import { cn } from "@/lib/utils";
import type { AnswerResult, ExamQuestion } from "@/server/exams";

const ACCENTS = ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"];

type Phase = "answering" | "checking" | "feedback";

export function TestRunner({
  examId,
  questions,
  startIndex,
  startCorrect,
  tags,
}: {
  examId: number;
  questions: ExamQuestion[];
  startIndex: number;
  startCorrect: number;
  tags: TagInfo[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(startIndex);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState(startCorrect);
  const [tagState, setTagState] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(questions.map((q) => [q.wordId, q.tagIds])),
  );
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const shownAt = useRef(0);

  const question = questions[index];
  const answerInSpanish = question.direction === "target_to_source";

  // New question: reset timer, focus input, and play the Spanish word when it is the prompt.
  useEffect(() => {
    shownAt.current = performance.now();
    inputRef.current?.focus();
    if (!answerInSpanish) playAudio(question.audioUrl);
  }, [index, answerInSpanish, question.audioUrl]);

  function setTag(wordId: number, tagId: number, on: boolean) {
    setTagState((s) => {
      const current = s[wordId] ?? [];
      return { ...s, [wordId]: on ? [...new Set([...current, tagId])] : current.filter((t) => t !== tagId) };
    });
  }

  function toggleTagByKey(tag: TagInfo) {
    const on = !(tagState[question.wordId] ?? []).includes(tag.id);
    setTag(question.wordId, tag.id, on);
    startTransition(() => toggleWordTag(question.wordId, tag.id, on));
  }

  // Keyboard shortcuts while feedback is shown: first letter of each tag toggles it.
  useEffect(() => {
    if (phase !== "feedback") return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement) return;
      const tag = tags.find((t) => t.name[0]?.toLowerCase() === e.key.toLowerCase());
      if (tag) {
        e.preventDefault();
        toggleTagByKey(tag);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function submit(given: string) {
    if (phase !== "answering") return;
    setPhase("checking");
    setError(null);
    const ms = Math.round(performance.now() - shownAt.current);
    startTransition(async () => {
      const res = await submitAnswer(examId, index, given, ms);
      if (!res.ok) {
        setError(res.error);
        setPhase("answering");
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      setResult(res.result);
      if (res.result.kind !== "wrong") setCorrect((c) => c + 1);
      setPhase("feedback");
      if (answerInSpanish) playAudio(question.audioUrl);
    });
  }

  function next() {
    if (result?.isLast) {
      router.push(`/test/${examId}/results`);
      return;
    }
    setIndex((i) => i + 1);
    setValue("");
    setResult(null);
    setPhase("answering");
  }

  function insertAccent(ch: string) {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + ch.length, start + ch.length);
    });
  }

  const done = index + (phase === "feedback" ? 1 : 0);
  const wordTags = tagState[question.wordId] ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>
            {correct} correct
          </span>
        </div>
        <Progress value={(done / questions.length) * 100} aria-label="Progress" />
      </div>

      <section className="flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {answerInSpanish ? "Translate into Spanish" : "Translate into English"}
        </span>
        {answerInSpanish ? (
          <p className="text-2xl font-semibold text-balance">{question.prompt.map(displayAnswer).join(" · ")}</p>
        ) : (
          <div className="flex items-center gap-1">
            <p className="text-4xl font-semibold tracking-tight">{question.prompt[0]}</p>
            <AudioButton url={question.audioUrl} />
          </div>
        )}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phase === "feedback") next();
          else submit(value);
        }}
        className="flex flex-col gap-3"
      >
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={phase !== "answering"}
          placeholder={answerInSpanish ? "Escribe en español…" : "Type in English…"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang={answerInSpanish ? "es" : "en"}
          className="h-12 text-center text-lg"
          aria-label="Your answer"
        />
        {answerInSpanish && phase === "answering" && (
          <div className="flex flex-wrap justify-center gap-1">
            {ACCENTS.map((ch) => (
              <Button key={ch} type="button" variant="outline" size="icon-sm" onClick={() => insertAccent(ch)}>
                {ch}
              </Button>
            ))}
          </div>
        )}
        {phase !== "feedback" && (
          <div className="flex justify-center gap-2">
            <Button type="submit" size="lg" disabled={phase === "checking"}>
              {phase === "checking" ? "Checking…" : "Check"}
            </Button>
            <Button type="button" size="lg" variant="ghost" disabled={phase === "checking"} onClick={() => submit("")}>
              I don’t know
            </Button>
          </div>
        )}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        {phase === "feedback" && result && (
          <Feedback result={result} given={value}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Tag:</span>
                {tags.map((t) => (
                  <TagToggle
                    key={t.id}
                    wordId={question.wordId}
                    tag={t}
                    on={wordTags.includes(t.id)}
                    onChange={(on) => setTag(question.wordId, t.id, on)}
                    shortcut={t.name[0].toUpperCase()}
                  />
                ))}
              </div>
              <Button type="submit" size="lg" autoFocus>
                {result.isLast ? "See results" : "Next"} <kbd className="ml-1 font-mono text-xs opacity-60">↵</kbd>
              </Button>
            </div>
          </Feedback>
        )}
      </form>
    </div>
  );
}

function Feedback({ result, given, children }: { result: AnswerResult; given: string; children: React.ReactNode }) {
  const tone = {
    exact: { title: "Correct!", cls: "border-green-600/30 bg-green-600/10" },
    almost: { title: "Almost — watch the spelling", cls: "border-amber-500/40 bg-amber-500/10" },
    wrong: { title: given.trim() ? "Not quite" : "Here’s the answer", cls: "border-red-600/30 bg-red-600/10" },
  }[result.kind];

  return (
    <div className={cn("space-y-3 rounded-xl border p-4", tone.cls)} role="status">
      <p className="font-semibold">{tone.title}</p>
      {result.kind === "almost" && result.matched && (
        <p className="text-sm">
          Correct spelling: <strong>{displayAnswer(result.matched)}</strong>
        </p>
      )}
      {result.alternative && (
        <p className="text-sm">
          Also valid — this card was <strong>{result.word}</strong>.
        </p>
      )}
      <p className="text-sm">
        <strong>{result.word}</strong> = {result.translations.map(displayAnswer).join(", ")}
      </p>
      {result.kind === "wrong" && given.trim() && (
        <p className="text-sm text-muted-foreground">
          You wrote: <span className="line-through">{given}</span>
        </p>
      )}
      {children}
    </div>
  );
}
