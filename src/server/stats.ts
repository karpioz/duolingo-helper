import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { examAnswers, examSessions, words } from "@/db/schema";
import { currentCourse } from "./course";
import { latestAnswers } from "./words";

/** Days are bucketed in this time zone (answers are stored in UTC). */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Europe/London";

export type DayActivity = { day: string; answers: number; correct: number };

async function rows<T>(query: ReturnType<typeof sql>) {
  return (await db.execute<T & Record<string, unknown>>(query)).rows as T[];
}

/**
 * Answers per local day over the last `days` days, plus today's local date (YYYY-MM-DD).
 * Across all courses: studying any language keeps the streak going.
 */
export async function dailyActivity(days = 371) {
  const tz = APP_TIMEZONE;
  const [activity, [{ today }]] = await Promise.all([
    rows<DayActivity>(sql`
      select to_char((${examAnswers.createdAt} at time zone ${tz})::date, 'YYYY-MM-DD') as day,
             count(*)::int as answers,
             count(*) filter (where ${examAnswers.isCorrect})::int as correct
      from ${examAnswers}
      where ${examAnswers.createdAt} >= now() - make_interval(days => ${days + 1})
      group by 1 order by 1`),
    rows<{ today: string }>(sql`select to_char((now() at time zone ${tz})::date, 'YYYY-MM-DD') as today`),
  ]);
  return { activity, today };
}

/** Answers to words of `course`, as a subquery with exam_answers' columns. */
const courseAnswers = (course: string) =>
  sql`(select a.* from ${examAnswers} a join ${words} w on w.id = a.word_id where w.course = ${course})`;

export async function totals() {
  const course = await currentCourse();
  const [t] = await rows<{
    answers: number;
    correct: number;
    almost: number;
    words: number;
    tests: number;
    medianMs: number | null;
  }>(sql`
    select count(*)::int as answers,
           count(*) filter (where is_correct)::int as correct,
           count(*) filter (where is_almost)::int as almost,
           count(distinct word_id)::int as words,
           (select count(*)::int from ${examSessions} where finished_at is not null and course = ${course}) as tests,
           percentile_cont(0.5) within group (order by response_ms)::int as "medianMs"
    from ${courseAnswers(course)} a`);
  return t;
}

export async function accuracyByDirection() {
  return rows<{ direction: "source_to_target" | "target_to_source"; answers: number; correct: number }>(sql`
    select direction, count(*)::int as answers, count(*) filter (where is_correct)::int as correct
    from ${courseAnswers(await currentCourse())} a group by direction`);
}

export type TestScore = {
  id: number;
  startedAt: string;
  size: number;
  correct: number;
  source: string;
  direction: string;
  mode: string;
  course: string;
};

/** Most recent finished tests, oldest first. */
export async function testScores(limit = 30) {
  const list = await rows<TestScore>(sql`
    select id, to_char(started_at at time zone ${APP_TIMEZONE}, 'YYYY-MM-DD"T"HH24:MI') as "startedAt",
           size, correct, source, direction, mode, course
    from ${examSessions}
    where finished_at is not null and size > 0 and course = ${await currentCourse()}
    order by started_at desc limit ${limit}`);
  return list.reverse();
}

/** Word coverage by latest answer: known (right), missed (wrong), or never practised. */
export async function coverage() {
  const course = await currentCourse();
  const [c] = await rows<{ total: number; known: number; missed: number }>(sql`
    select (select count(*)::int from ${words} where course = ${course}) as total,
           count(*) filter (where x.is_correct)::int as known,
           count(*) filter (where not x.is_correct)::int as missed
    from (${latestAnswers(course)}) x`);
  return { ...c, unpractised: c.total - c.known - c.missed };
}

export type HardWord = {
  id: number;
  text: string;
  translations: string[];
  answers: number;
  wrong: number;
  lastWrong: boolean;
  tagIds: number[];
};

/** Words answered wrong most often (at least one wrong answer). */
export async function hardestWords(limit = 10) {
  const course = await currentCourse();
  return rows<HardWord>(sql`
    select w.id, w.text,
           coalesce((select array_agg(t.text order by t.position) from translations t where t.word_id = w.id), '{}') as translations,
           coalesce((select array_agg(wt.tag_id) from word_tags wt where wt.word_id = w.id), '{}') as "tagIds",
           a.answers, a.wrong, not l.is_correct as "lastWrong"
    from (
      select word_id, count(*)::int as answers, count(*) filter (where not is_correct)::int as wrong
      from ${courseAnswers(course)} x group by word_id
    ) a
    join ${words} w on w.id = a.word_id
    join (${latestAnswers(course)}) l on l.word_id = a.word_id
    where a.wrong > 0
    order by a.wrong desc, a.wrong::float / a.answers desc, w.text
    limit ${limit}`);
}

/** Current and longest runs of consecutive active days (current counts today or yesterday). */
export function streaks(activity: DayActivity[], today: string) {
  const active = new Set(activity.filter((d) => d.answers > 0).map((d) => d.day));
  const shift = (day: string, n: number) => {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  let current = 0;
  let cursor = active.has(today) ? today : shift(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = shift(cursor, -1);
  }

  let longest = 0;
  for (const day of active) {
    if (active.has(shift(day, -1))) continue; // not the start of a run
    let len = 0;
    let d = day;
    while (active.has(d)) {
      len++;
      d = shift(d, 1);
    }
    longest = Math.max(longest, len);
  }
  return { current, longest, activeDays: active.size };
}
