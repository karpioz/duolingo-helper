import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recentExams } from "@/server/exams";
import { dueCounts } from "@/server/review";
import { libraryStats, listTags } from "@/server/words";
import { courseInfo } from "@/lib/courses";
import { describeExam } from "@/lib/exam-labels";
import { currentCourse } from "@/server/course";

export default async function Home() {
  await connection();
  const [stats, tags, exams, due, course] = await Promise.all([
    libraryStats(),
    listTags(),
    recentExams(),
    dueCounts(),
    currentCourse(),
  ]);
  const info = courseInfo(course);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{info.learning.greeting}</h1>
          <p className="text-muted-foreground">
            {stats.words.toLocaleString()} {info.learning.name} words from Duolingo, ready to practise.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" nativeButton={false} render={<Link href="/test" />}>
            Test me
          </Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/words" />}>
            Browse words
          </Button>
        </div>
      </section>

      {due.total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-saffron/50 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              {due.total} word{due.total === 1 ? "" : "s"} due for review
            </p>
            <p className="text-sm text-muted-foreground">
              Spaced repetition brings back words just before you’d forget them.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/test?source=due" />}>
            Review now
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Words" value={stats.words} href="/words" />
        <Stat label="Translations" value={stats.translations} />
        {tags.map((t) => (
          <Stat key={t.id} label={`Tagged ${t.name}`} value={t.words} href={`/words?tag=${t.id}`} color={t.color} />
        ))}
        <Stat label="Missed last time" value={stats.missed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tests</CardTitle>
          {exams.length === 0 && <CardDescription>No tests yet. Start one with “Test me”.</CardDescription>}
        </CardHeader>
        {exams.length > 0 && (
          <CardContent>
            <ul className="divide-y">
              {exams.map((e) => {
                const pct = Math.round((e.correct / e.size) * 100);
                return (
                  <li key={e.id}>
                    <Link href={`/test/${e.id}/results`} className="flex items-center justify-between gap-4 py-2.5 hover:underline">
                      <span className="text-sm">
                        {describeExam(e)}
                        <span className="ml-2 text-muted-foreground">
                          {e.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {e.correct}/{e.size} · {pct}%
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        )}
      </Card>

      {stats.words === 0 && (
        <p className="text-sm text-muted-foreground">
          No words yet — see <Link className="underline" href="/import">Import</Link> to load your Duolingo vocabulary.
        </p>
      )}
    </main>
  );
}

function Stat({ label, value, href, color }: { label: string; value: number; href?: string; color?: string | null }) {
  const body = (
    <>
      <div className="font-heading text-3xl font-extrabold tracking-tight tabular-nums" style={color ? { color } : undefined}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </>
  );
  const cls = "rounded-2xl bg-card p-4 shadow-[0_1px_0_var(--border)]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:bg-muted`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
