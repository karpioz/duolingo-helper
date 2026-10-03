import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Grade } from "ts-fsrs";
import { db } from "@/db";
import { reviewStates, words } from "@/db/schema";
import { reviewCard } from "@/lib/srs";
import { APP_TIMEZONE } from "./stats";
import { currentCourse } from "./course";

type Direction = "source_to_target" | "target_to_source";
/** A transaction or the db itself. */
type Executor = Pick<typeof db, "select" | "insert">;

/** Records one review of a word in one direction; returns the next due date. */
export async function applyReview(
  tx: Executor,
  r: { wordId: number; direction: Direction; grade: Grade; correct: boolean; at: Date },
): Promise<Date> {
  const [existing] = await tx
    .select({ card: reviewStates.card })
    .from(reviewStates)
    .where(and(eq(reviewStates.wordId, r.wordId), eq(reviewStates.direction, r.direction)))
    .for("update");

  const card = reviewCard(existing?.card ?? null, r.grade, r.at);
  const values = {
    due: card.due,
    state: card.state,
    card,
    lastReviewedAt: r.at,
  };
  await tx
    .insert(reviewStates)
    .values({ wordId: r.wordId, direction: r.direction, ...values, correctCount: r.correct ? 1 : 0, wrongCount: r.correct ? 0 : 1 })
    .onConflictDoUpdate({
      target: [reviewStates.wordId, reviewStates.direction],
      set: {
        ...values,
        correctCount: sql`${reviewStates.correctCount} + ${r.correct ? 1 : 0}`,
        wrongCount: sql`${reviewStates.wrongCount} + ${r.correct ? 0 : 1}`,
      },
    });
  return card.due;
}

/** Words with at least one direction due now (overall and per direction). */
export async function dueCounts() {
  const res = await db.execute<{ total: number; source_to_target: number; target_to_source: number }>(sql`
    select count(distinct rs.word_id)::int as total,
           count(*) filter (where rs.direction = 'source_to_target')::int as source_to_target,
           count(*) filter (where rs.direction = 'target_to_source')::int as target_to_source
    from ${reviewStates} rs join ${words} w on w.id = rs.word_id
    where w.course = ${await currentCourse()} and rs.due <= now()`);
  return res.rows[0];
}

/** Reviews (word × direction) due on each of the next `days` local days; today includes overdue. */
export async function reviewForecast(days = 14) {
  const tz = APP_TIMEZONE;
  const course = await currentCourse();
  const res = await db.execute<{ day: string; reviews: number }>(sql`
    with days as (
      select generate_series(0, ${days - 1}) as n
    ), today as (
      select (now() at time zone ${tz})::date as d
    )
    select to_char(today.d + days.n, 'YYYY-MM-DD') as day,
           (select count(*)::int from ${reviewStates} rs join ${words} w on w.id = rs.word_id
             where w.course = ${course} and case when days.n = 0
                        then (rs.due at time zone ${tz})::date <= today.d
                        else (rs.due at time zone ${tz})::date = today.d + days.n end) as reviews
    from days, today
    order by days.n`);
  return res.rows;
}
