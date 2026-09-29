import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ActivityCalendar } from "@/components/charts/activity-calendar";
import { ScoreChart } from "@/components/charts/score-chart";
import { TagToggle } from "@/components/tag-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayAnswer } from "@/lib/answers";
import { DIRECTION_LABELS } from "@/lib/exam-labels";
import {
  accuracyByDirection,
  coverage,
  dailyActivity,
  hardestWords,
  streaks,
  testScores,
  totals,
} from "@/server/stats";
import { listTags } from "@/server/words";

export const metadata: Metadata = { title: "Analytics · Duolingo Helper" };

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export default async function AnalyticsPage() {
  await connection();
  const [{ activity, today }, t, directions, tests, cov, hard, tags] = await Promise.all([
    dailyActivity(),
    totals(),
    accuracyByDirection(),
    testScores(),
    coverage(),
    hardestWords(),
    listTags(),
  ]);
  const streak = streaks(activity, today);
  const systemTags = tags.filter((tag) => tag.system).map(({ id, name, color }) => ({ id, name, color }));

  if (t.answers === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">No answers yet — take a test and your progress will show up here.</p>
        <Button className="self-start" nativeButton={false} render={<Link href="/test" />}>
          Test me
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile value={`${pct(t.correct, t.answers)}%`} label="Accuracy" detail={`${t.correct.toLocaleString()} of ${t.answers.toLocaleString()} answers`} />
        <Tile
          value={`${streak.current} day${streak.current === 1 ? "" : "s"}`}
          label="Current streak"
          detail={`Longest ${streak.longest} · ${streak.activeDays} active days`}
        />
        <Tile value={t.words.toLocaleString()} label="Words practised" detail={`of ${cov.total.toLocaleString()} (${pct(t.words, cov.total)}%)`} />
        <Tile
          value={t.medianMs == null ? "—" : `${(t.medianMs / 1000).toFixed(1)}s`}
          label="Typical answer time"
          detail={`${t.tests} test${t.tests === 1 ? "" : "s"} finished`}
        />
      </div>

      <Card>
        <CardContent>
          <ActivityCalendar activity={activity} today={today} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardContent>
            {tests.length > 0 ? (
              <ScoreChart tests={tests} />
            ) : (
              <p className="text-sm text-muted-foreground">Finish a test to see scores over time.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Accuracy by direction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["source_to_target", "target_to_source"] as const).map((dir) => {
              const d = directions.find((x) => x.direction === dir);
              const value = d ? pct(d.correct, d.answers) : null;
              return (
                <div key={dir} className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{DIRECTION_LABELS[dir]}</span>
                    <span className="font-semibold tabular-nums">{value == null ? "—" : `${value}%`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--viz-empty)]">
                    {value != null && (
                      <div className="h-2 rounded-full bg-[var(--viz-series-1)]" style={{ width: `${Math.max(value, 2)}%` }} />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d ? `${d.correct} of ${d.answers} answers` : "Not practised yet"}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Word coverage</CardTitle>
          <CardDescription>Based on each word’s most recent answer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CoverageBar
            segments={[
              { label: "Known", value: cov.known, color: "var(--viz-good)" },
              { label: "Missed last time", value: cov.missed, color: "var(--viz-critical)" },
              { label: "Not practised", value: cov.unpractised, color: "var(--viz-neutral)" },
            ]}
            total={cov.total}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hardest words</CardTitle>
          <CardDescription>Most wrong answers across all tests.</CardDescription>
        </CardHeader>
        <CardContent>
          {hard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wrong answers yet. ¡Muy bien!</p>
          ) : (
            <ul className="divide-y">
              {hard.map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{w.text}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {w.translations.map(displayAnswer).join(", ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm tabular-nums">
                    <div>
                      {w.wrong} wrong of {w.answers}
                    </div>
                    <div className="text-xs text-muted-foreground">{w.lastWrong ? "Missed last time" : "Right last time"}</div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {systemTags.map((tag) => (
                      <TagToggle key={tag.id} wordId={w.id} tag={tag} on={w.tagIds.includes(tag.id)} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Tile({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

/** Part-to-whole bar with 2px gaps between segments; legend carries labels and counts. */
function CoverageBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <>
      <div className="flex h-4 gap-0.5" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        {visible.map((s, i) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.value.toLocaleString()} (${pct(s.value, total)}%)`}
            className={i === 0 ? "rounded-l" : i === visible.length - 1 ? "rounded-r" : ""}
            style={{ flexGrow: s.value, flexBasis: 0, minWidth: 4, background: s.color }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
            <span className="text-muted-foreground tabular-nums">
              {s.value.toLocaleString()} · {pct(s.value, total)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
