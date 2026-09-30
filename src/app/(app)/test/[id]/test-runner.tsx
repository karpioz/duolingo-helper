"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitAnswer, submitChoice, toggleWordTag } from "@/app/actions";
import { AudioButton, playAudio } from "@/components/audio-button";
import { TagToggle, type TagInfo } from "@/components/tag-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { displayAnswer } from "@/lib/answers";
import { formatDue } from "@/lib/srs";
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
  const [nextReview, setNextReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState(startCorrect);
  /** Multiple choice: the option picked (null = "I don't know"). */
  const [picked, setPicked] = useState<number | null>(null);
  const [tagState, setTagState] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(questions.map((q) => [q.wordId, q.tagIds])),
  );
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const shownAt = useRef(0);

  const question = questions[index];
  const answerInSpanish = question.direction === "target_to_source";
  const choices = question.choices;

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

  // Keyboard shortcuts: 1–4 pick an option; while feedback is shown, a tag's first letter toggles it.
  useEffect(() => {
    if (phase === "checking") return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement) return;
      if (phase === "answering") {
        const n = Number(e.key);
        if (choices && Number.isInteger(n) && n >= 1 && n <= choices.length) {
          e.preventDefault();
          choose(n - 1);
        }
        return;
      }
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
    send((ms) => submitAnswer(examId, index, given, ms));
  }

  function choose(choice: number | null) {
    if (phase !== "answering") return;
    setPicked(choice);
    send((ms) => submitChoice(examId, index, choice, ms));
  }

  function send(save: (ms: number) => ReturnType<typeof submitAnswer>) {
    if (phase !== "answering") return;
    setPhase("checking");
    setError(null);
    const ms = Math.round(performance.now() - shownAt.current);
    startTransition(async () => {
      const res = await save(ms);
      if (!res.ok) {
        setError(res.error);
        setPhase("answering");
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      setResult(res.result);
      setNextReview(formatDue(new Date(res.result.nextDue), new Date()));
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
    setPicked(null);
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
          else if (!choices) submit(value);
        }}
        className="flex flex-col gap-3"
      >
        {choices ? (
          <ChoiceOptions
            choices={choices}
            picked={picked}
            correctChoice={result?.correctChoice}
            disabled={phase !== "answering"}
            lang={answerInSpanish ? "es" : "en"}
            onChoose={choose}
          />
        ) : (
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
        )}
        {!choices && answerInSpanish && phase === "answering" && (
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
            {!choices && (
              <Button type="submit" size="lg" disabled={phase === "checking"}>
                {phase === "checking" ? "Checking…" : "Check"}
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              variant="ghost"
              disabled={phase === "checking"}
              onClick={() => (choices ? choose(null) : submit(""))}
            >
              I don’t know
            </Button>
          </div>
        )}
        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        {phase === "feedback" && result && (
          <Feedback
            result={result}
            given={choices ? (picked === null ? "" : choices[picked]) : value}
            showGiven={!choices}
            nextReview={nextReview}
          >
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

function Feedback({
  result,
  given,
  showGiven,
  nextReview,
  children,
}: {
  result: AnswerResult;
  given: string;
  /** Typed answers repeat what was written; multiple choice already shows the pick. */
  showGiven: boolean;
  nextReview: string | null;
  children: React.ReactNode;
}) {
  const tone = {
    exact: { title: "Correct!", cls: "border-green-600/30 bg-green-600/10" },
    almost: { title: "Almost — watch the spelling", cls: "border-amber-500/40 bg-amber-500/10" },
    wrong: { title: given.trim() ? "Not quite" : "Here’s the answer", cls: "border-red-600/30 bg-red-600/10" },
  }[result.kind];

  return (
    <div className={cn("space-y-3 rounded-xl border p-4", tone.cls)} role="status">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{tone.title}</p>
        {nextReview && <span className="text-xs text-muted-foreground">Next review {nextReview}</span>}
      </div>
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
      {showGiven && result.kind === "wrong" && given.trim() && (
        <p className="text-sm text-muted-foreground">
          You wrote: <span className="line-through">{given}</span>
        </p>
      )}
      {children}
    </div>
  );
}

function ChoiceOptions({
  choices,
  picked,
  correctChoice,
  disabled,
  lang,
  onChoose,
}: {
  choices: string[];
  picked: number | null;
  /** Known once the answer is checked. */
  correctChoice: number | undefined;
  disabled: boolean;
  lang: string;
  onChoose: (choice: number) => void;
}) {
  const checked = correctChoice !== undefined;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {choices.map((text, i) => {
        const isRight = checked && i === correctChoice;
        const isWrongPick = checked && i === picked && !isRight;
        return (
          <button
            key={i}
            type="button"
            lang={lang}
            disabled={disabled}
            onClick={() => onChoose(i)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border-2 border-b-4 px-4 py-2 text-left text-lg transition-colors",
              !checked && "hover:bg-muted",
              !checked && i === picked && "border-sky-500 bg-sky-500/10",
              isRight && "border-green-600 bg-green-600/10",
              isWrongPick && "animate-shake border-red-500 bg-red-500/10",
              checked && !isRight && !isWrongPick && "opacity-50",
            )}
          >
            <kbd className="flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs text-muted-foreground">
              {i + 1}
            </kbd>
            <span>{displayAnswer(text)}</span>
          </button>
        );
      })}
    </div>
  );
}
