import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DIRECTION_LABELS } from "@/lib/exam-labels";
import { listPersonalTests } from "@/server/personal-tests";
import { DeleteTestButton, StartTestButton } from "./test-actions";

export const metadata: Metadata = { title: "My tests · Duolingo Helper" };

const MODE_LABELS = { typed: "Type answers", choice: "Multiple choice", match: "Match pairs" } as const;

export default async function MyTestsPage() {
  const tests = await listPersonalTests();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="space-y-1">
        <Link href="/test" className="text-sm text-muted-foreground hover:text-foreground">
          ← Test me
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">My tests</h1>
          <Button nativeButton={false} render={<Link href="/test/personal/new" />}>
            New test
          </Button>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No personal tests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the words you want to practise and save them as a test you can run any time.
          </p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/test/personal/new" />}>
            Create your first test
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {tests.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/test/personal/${t.id}`} className="font-medium hover:underline">
                  {t.name}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {MODE_LABELS[t.mode]} · {DIRECTION_LABELS[t.direction]} · {t.words} {t.words === 1 ? "word" : "words"}
                </div>
                {t.lastRun && (
                  <Link href={`/test/${t.lastRun.id}/results`} className="text-xs text-muted-foreground hover:underline">
                    Last run {t.lastRun.at.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}:{" "}
                    <span className="tabular-nums">
                      {t.lastRun.correct}/{t.lastRun.size} · {Math.round((t.lastRun.correct / t.lastRun.size) * 100)}%
                    </span>
                  </Link>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StartTestButton id={t.id} disabled={t.words === 0} />
                <Button variant="outline" nativeButton={false} render={<Link href={`/test/personal/${t.id}`} />}>
                  Edit
                </Button>
                <DeleteTestButton id={t.id} name={t.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
