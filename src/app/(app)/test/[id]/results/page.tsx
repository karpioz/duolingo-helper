import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioButton } from "@/components/audio-button";
import { TagToggle } from "@/components/tag-toggle";
import { Button } from "@/components/ui/button";
import { displayAnswer } from "@/lib/answers";
import { describeExam } from "@/lib/exam-labels";
import { cn } from "@/lib/utils";
import { getResults } from "@/server/exams";
import { listTags } from "@/server/words";
import { RetestButton } from "./retest-button";

export const metadata: Metadata = { title: "Results · Duolingo Helper" };

export default async function ResultsPage({ params }: PageProps<"/test/[id]/results">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [results, tags] = await Promise.all([getResults(id), listTags()]);
  if (!results) notFound();
  const { session, answers, lenient, testName } = results;
  const systemTags = tags.filter((t) => t.system).map(({ id, name, color }) => ({ id, name, color }));

  const correct = answers.filter((a) => a.isCorrect).length;
  const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const missedIds = [...new Set(answers.filter((a) => !a.isCorrect).map((a) => a.wordId))];
  const unfinished = answers.length < session.size;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <section className="space-y-1">
        <p className="text-sm text-muted-foreground">{describeExam(session.source, session.direction, session.mode, testName)}</p>
        <h1 className="text-3xl font-semibold tracking-tight tabular-nums">
          {correct} / {answers.length} <span className="text-muted-foreground">· {pct}%</span>
        </h1>
        {unfinished && (
          <p className="text-sm text-muted-foreground">
            Unfinished: {answers.length} of {session.size} answered.{" "}
            <Link className="underline" href={`/test/${id}`}>
              Continue
            </Link>
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {missedIds.length > 0 && (
          <RetestButton
            wordIds={missedIds}
            direction={session.direction}
            mode={session.mode}
            lenient={lenient}
            label={`Retest ${missedIds.length} missed`}
          />
        )}
        <Button variant={missedIds.length ? "outline" : "default"} nativeButton={false} render={<Link href="/test" />}>
          New test
        </Button>
        {session.source === "personal" && (
          <Button variant="outline" nativeButton={false} render={<Link href="/test/personal" />}>
            My tests
          </Button>
        )}
      </div>

      <ul className="divide-y rounded-xl border">
        {answers.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                !a.isCorrect ? "bg-red-600" : a.isAlmost ? "bg-amber-500" : "bg-green-600",
              )}
              aria-label={!a.isCorrect ? "Wrong" : a.isAlmost ? "Almost" : "Correct"}
            >
              {!a.isCorrect ? "✗" : a.isAlmost ? "~" : "✓"}
            </span>
            <AudioButton url={a.audioUrl} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {a.text}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {a.direction === "source_to_target" ? "ES → EN" : "EN → ES"}
                </span>
              </div>
              <div className="truncate text-sm text-muted-foreground">{a.translations.map(displayAnswer).join(", ")}</div>
              {!a.isCorrect && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {a.given?.trim() ? (
                    <>
                      {session.mode === "choice" ? "You picked" : "You wrote"}:{" "}
                      <span className="line-through">{a.given}</span>
                    </>
                  ) : session.mode === "match" ? (
                    "Mismatched at least once"
                  ) : (
                    "Skipped"
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {systemTags.map((t) => (
                <TagToggle key={t.id} wordId={a.wordId} tag={t} on={a.tagIds.includes(t.id)} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
