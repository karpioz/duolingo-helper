import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examSessions, personalTestWords, personalTests, words, type ExamSession } from "@/db/schema";
import { COURSE, alphaKey, matchesQuery, wordTranslations } from "./words";

/** Exams take at most 200 words, so a personal test does too. */
export const MAX_PERSONAL_WORDS = 200;

export const personalTestSchema = z
  .object({
  name: z.string().trim().min(1, "Give the test a name.").max(100),
  mode: z.enum(["typed", "choice", "match"]),
  direction: z.enum(["source_to_target", "target_to_source", "mixed"]),
  wordIds: z
    .array(z.number().int())
    .min(1, "Add at least one word.")
    .max(MAX_PERSONAL_WORDS, `A test can have at most ${MAX_PERSONAL_WORDS} words.`)
    .transform((ids) => [...new Set(ids)]),
  })
  .refine((t) => t.mode !== "match" || t.wordIds.length >= 2, "Match pairs needs at least 2 words.");
export type PersonalTestInput = z.infer<typeof personalTestSchema>;

export type PickedWord = {
  id: number;
  text: string;
  translations: string[];
  preferred: string | null;
  audioUrl: string | null;
};

const wordColumns = {
  id: words.id,
  text: words.text,
  audioUrl: words.audioUrl,
  translations: wordTranslations(),
  preferred: words.preferredTranslation,
};

/** Words for the test creator: exact and prefix matches first, then most recently learned. */
export async function searchWords(q: string, limit = 20): Promise<PickedWord[]> {
  const query = q.trim();
  const base = eq(words.course, COURSE);
  if (!query) {
    return db.select(wordColumns).from(words).where(base).orderBy(sql`${words.duoRank} asc nulls last`).limit(limit);
  }
  const key = sql`unaccent(lower(${query}))`;
  return db
    .select(wordColumns)
    .from(words)
    .where(and(base, matchesQuery(query)))
    .orderBy(
      sql`${alphaKey} = ${key} desc`,
      sql`starts_with(${alphaKey}, ${key}) desc`,
      sql`${words.duoRank} asc nulls last`,
      asc(alphaKey),
    )
    .limit(limit);
}

export type PersonalTestSummary = {
  id: number;
  name: string;
  mode: "typed" | "choice" | "match";
  direction: "source_to_target" | "target_to_source" | "mixed";
  words: number;
  updatedAt: Date;
  /** Latest finished run of this test. */
  lastRun: { id: number; correct: number; size: number; at: Date } | null;
};

export async function listPersonalTests(): Promise<PersonalTestSummary[]> {
  const res = await db.execute<{
    id: number;
    name: string;
    mode: "typed" | "choice" | "match";
    direction: PersonalTestSummary["direction"];
    words: number;
    updated_at: string;
    run_id: number | null;
    run_correct: number | null;
    run_size: number | null;
    run_at: string | null;
  }>(sql`
    select p.id, p.name, p.mode, p.direction, p.updated_at,
      (select count(*)::int from ${personalTestWords} pw where pw.test_id = p.id) as words,
      r.id as run_id, r.correct as run_correct, r.size as run_size, r.finished_at as run_at
    from ${personalTests} p
    left join lateral (
      select e.id, e.correct, e.size, e.finished_at from ${examSessions} e
      where (e.options->>'personalTestId')::int = p.id and e.finished_at is not null
      order by e.finished_at desc limit 1
    ) r on true
    where p.course = ${COURSE}
    order by p.updated_at desc`);
  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    mode: r.mode,
    direction: r.direction,
    words: r.words,
    updatedAt: new Date(r.updated_at),
    lastRun:
      r.run_id == null ? null : { id: r.run_id, correct: r.run_correct!, size: r.run_size!, at: new Date(r.run_at!) },
  }));
}

export async function getPersonalTest(id: number) {
  const [test] = await db.select().from(personalTests).where(eq(personalTests.id, id));
  if (!test) return null;
  const picked = await db
    .select(wordColumns)
    .from(personalTestWords)
    .innerJoin(words, eq(words.id, personalTestWords.wordId))
    .where(eq(personalTestWords.testId, id))
    .orderBy(asc(personalTestWords.position));
  return { test, words: picked satisfies PickedWord[] };
}

/** Word ids of a test in the creator's order. */
export async function personalTestWordIds(id: number): Promise<number[]> {
  const rows = await db
    .select({ id: personalTestWords.wordId })
    .from(personalTestWords)
    .where(eq(personalTestWords.testId, id))
    .orderBy(asc(personalTestWords.position));
  return rows.map((r) => r.id);
}

/** Creates (no `id`) or replaces a test; returns its id, or null if `id` doesn't exist. */
export async function savePersonalTest(input: PersonalTestInput, id?: number): Promise<number | null> {
  // Ignore ids that aren't words in this course (e.g. deleted since the page loaded).
  const valid = new Set(
    (
      await db
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.course, COURSE), inArray(words.id, input.wordIds)))
    ).map((r) => r.id),
  );
  const wordIds = input.wordIds.filter((w) => valid.has(w));
  const fields = { name: input.name, mode: input.mode, direction: input.direction };

  return db.transaction(async (tx) => {
    let testId: number;
    if (id === undefined) {
      [{ id: testId }] = await tx
        .insert(personalTests)
        .values({ course: COURSE, ...fields })
        .returning({ id: personalTests.id });
    } else {
      const updated = await tx
        .update(personalTests)
        .set(fields)
        .where(eq(personalTests.id, id))
        .returning({ id: personalTests.id });
      if (updated.length === 0) return null;
      testId = id;
      await tx.delete(personalTestWords).where(eq(personalTestWords.testId, id));
    }
    if (wordIds.length > 0) {
      await tx.insert(personalTestWords).values(wordIds.map((wordId, position) => ({ testId, wordId, position })));
    }
    return testId;
  });
}

export async function deletePersonalTest(id: number) {
  await db.delete(personalTests).where(eq(personalTests.id, id));
}

/**
 * Saves the words of an exam (in question order, with its type and direction) as a personal
 * test, and links the exam to it so it counts as the test's latest run. Returns the test id.
 */
export async function savePersonalFromExam(session: ExamSession, name: string): Promise<number> {
  const options = session.options as { questions: { wordId: number }[] };
  const wordIds = [...new Set(options.questions.map((q) => q.wordId))].slice(0, MAX_PERSONAL_WORDS);
  const input = personalTestSchema.parse({ name, mode: session.mode, direction: session.direction, wordIds });
  const testId = (await savePersonalTest(input))!;
  await db
    .update(examSessions)
    .set({
      options: sql`${examSessions.options} || ${JSON.stringify({ personalTestId: testId, testName: input.name })}::jsonb`,
    })
    .where(eq(examSessions.id, session.id));
  return testId;
}
