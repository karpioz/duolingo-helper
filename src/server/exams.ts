import "server-only";
import { and, asc, desc, eq, exists, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examAnswers, examSessions, translations, wordTags, words } from "@/db/schema";
import { checkAnswer, type MatchKind } from "@/lib/answers";
import { COURSE, WORD_ID, alphaKey, latestAnswers, wordTagIds, wordTranslations } from "./words";

export type Direction = "source_to_target" | "target_to_source";

export const examOptionsSchema = z.object({
  count: z.coerce.number().int().min(1).max(200),
  source: z.enum(["recent", "alphabetical", "random", "tagged", "missed", "retest"]),
  direction: z.enum(["source_to_target", "target_to_source", "mixed"]),
  lenient: z.boolean().default(true),
  tagIds: z.array(z.number().int()).default([]),
  /** Alphabetical only: start from this letter. */
  startLetter: z
    .string()
    .trim()
    .max(1)
    .optional()
    .transform((s) => s || undefined),
  /** Retest only: the exact words to use. */
  wordIds: z.array(z.number().int()).max(200).default([]),
});
export type ExamOptions = z.infer<typeof examOptionsSchema>;

type Question = { wordId: number; direction: Direction };
type StoredOptions = Pick<ExamOptions, "lenient" | "tagIds" | "startLetter"> & { questions: Question[] };

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function pickWordIds(o: ExamOptions): Promise<number[]> {
  const base = eq(words.course, COURSE);
  const ids = (rows: { id: number }[]) => rows.map((r) => r.id);

  switch (o.source) {
    case "recent":
      return ids(
        await db.select({ id: words.id }).from(words).where(base).orderBy(sql`${words.duoRank} asc nulls last`).limit(o.count),
      );
    case "alphabetical": {
      const from = o.startLetter ? sql`${alphaKey} >= unaccent(lower(${o.startLetter}))` : sql`true`;
      return ids(await db.select({ id: words.id }).from(words).where(and(base, from)).orderBy(asc(alphaKey)).limit(o.count));
    }
    case "random":
      return ids(await db.select({ id: words.id }).from(words).where(base).orderBy(sql`random()`).limit(o.count));
    case "tagged":
      if (o.tagIds.length === 0) return [];
      return ids(
        await db
          .select({ id: words.id })
          .from(words)
          .where(
            and(
              base,
              exists(
                db
                  .select({ one: sql`1` })
                  .from(wordTags)
                  .where(and(sql`${wordTags.wordId} = ${WORD_ID}`, inArray(wordTags.tagId, o.tagIds))),
              ),
            ),
          )
          .orderBy(sql`random()`)
          .limit(o.count),
      );
    case "missed": {
      const res = await db.execute<{ word_id: number }>(
        sql`select word_id from (${latestAnswers()}) x where not x.is_correct order by created_at desc limit ${o.count}`,
      );
      return res.rows.map((r) => r.word_id);
    }
    case "retest":
      return o.wordIds.slice(0, o.count);
  }
}

/** Creates an exam session; returns its id, or null if no words match. */
export async function createExam(o: ExamOptions): Promise<number | null> {
  const wordIds = shuffle(await pickWordIds(o));
  if (wordIds.length === 0) return null;

  const questions: Question[] = wordIds.map((wordId) => ({
    wordId,
    direction:
      o.direction === "mixed" ? (Math.random() < 0.5 ? "source_to_target" : "target_to_source") : o.direction,
  }));
  const options: StoredOptions = { lenient: o.lenient, tagIds: o.tagIds, startLetter: o.startLetter, questions };

  const [session] = await db
    .insert(examSessions)
    .values({ course: COURSE, mode: "typed", direction: o.direction, source: o.source, size: questions.length, options })
    .returning({ id: examSessions.id });
  return session.id;
}

export type ExamQuestion = {
  wordId: number;
  direction: Direction;
  /** Spanish word (source_to_target) or its English translations (target_to_source). */
  prompt: string[];
  audioUrl: string | null;
  tagIds: number[];
};

export async function getExam(id: number) {
  const [session] = await db.select().from(examSessions).where(eq(examSessions.id, id));
  if (!session) return null;
  const options = session.options as StoredOptions;

  const wordIds = options.questions.map((q) => q.wordId);
  const wordRows = await db
    .select({
      id: words.id,
      text: words.text,
      audioUrl: words.audioUrl,
      translations: wordTranslations(),
      tagIds: wordTagIds(),
    })
    .from(words)
    .where(inArray(words.id, wordIds));
  const byId = new Map(wordRows.map((w) => [w.id, w]));

  const questions: ExamQuestion[] = options.questions
    .filter((q) => byId.has(q.wordId))
    .map((q) => {
      const w = byId.get(q.wordId)!;
      return {
        wordId: q.wordId,
        direction: q.direction,
        prompt: q.direction === "source_to_target" ? [w.text] : w.translations,
        audioUrl: w.audioUrl,
        tagIds: w.tagIds,
      };
    });

  const [{ answered }] = await db
    .select({ answered: sql<number>`count(*)::int` })
    .from(examAnswers)
    .where(eq(examAnswers.sessionId, id));

  return { session, lenient: options.lenient, questions, answered };
}

/**
 * Other words in the course that fit every translation of `wordId`: for English → Spanish,
 * "(you) learned, learned" could be several Spanish forms, and any of them is a fair answer.
 */
async function alternativeWords(wordId: number): Promise<string[]> {
  const res = await db.execute<{ text: string }>(sql`
    select w2.text from ${words} w2
    where w2.course = ${COURSE} and w2.id <> ${wordId}
      and exists (select 1 from ${translations} t where t.word_id = ${wordId})
      and not exists (
        select 1 from ${translations} t where t.word_id = ${wordId}
          and not exists (
            select 1 from ${translations} t2 where t2.word_id = w2.id and lower(t2.text) = lower(t.text)
          )
      )`);
  return res.rows.map((r) => r.text);
}

export type AnswerResult = {
  kind: MatchKind;
  /** What the answer matched (may be an alternative word for target_to_source). */
  matched?: string;
  /** Answered with a different but valid word (target_to_source only). */
  alternative: boolean;
  /** The word and its translations, for feedback. */
  word: string;
  translations: string[];
  isLast: boolean;
};

export async function recordAnswer(sessionId: number, index: number, given: string, responseMs: number | null) {
  const exam = await getExam(sessionId);
  if (!exam) throw new Error("Exam not found.");
  if (index !== exam.answered) throw new Error("Answer out of order: reload the page.");
  const question = exam.questions[index];
  if (!question) throw new Error("No such question.");

  const [word] = await db
    .select({ text: words.text, translations: wordTranslations() })
    .from(words)
    .where(eq(words.id, question.wordId));

  let accepted: string[];
  let alternatives: string[] = [];
  if (question.direction === "source_to_target") {
    accepted = word.translations;
  } else {
    alternatives = await alternativeWords(question.wordId);
    accepted = [word.text, ...alternatives];
  }

  const check = checkAnswer(given, accepted, { lenient: exam.lenient });
  const isCorrect = check.kind !== "wrong";
  const isLast = index === exam.questions.length - 1;

  await db.transaction(async (tx) => {
    await tx.insert(examAnswers).values({
      sessionId,
      wordId: question.wordId,
      direction: question.direction,
      given: given.slice(0, 500),
      isCorrect,
      isAlmost: check.kind === "almost",
      responseMs,
    });
    const changes = {
      ...(isCorrect ? { correct: sql`${examSessions.correct} + 1` } : {}),
      ...(isLast ? { finishedAt: new Date() } : {}),
    };
    // Drizzle rejects an empty SET (wrong answer, not the last question).
    if (Object.keys(changes).length > 0) {
      await tx.update(examSessions).set(changes).where(eq(examSessions.id, sessionId));
    }
  });

  return {
    kind: check.kind,
    matched: check.matched,
    alternative: !!check.matched && alternatives.includes(check.matched),
    word: word.text,
    translations: word.translations,
    isLast,
  } satisfies AnswerResult;
}

export async function getResults(sessionId: number) {
  const [session] = await db.select().from(examSessions).where(eq(examSessions.id, sessionId));
  if (!session) return null;
  const answers = await db
    .select({
      id: examAnswers.id,
      wordId: examAnswers.wordId,
      direction: examAnswers.direction,
      given: examAnswers.given,
      isCorrect: examAnswers.isCorrect,
      isAlmost: examAnswers.isAlmost,
      text: words.text,
      audioUrl: words.audioUrl,
      translations: wordTranslations(),
      tagIds: wordTagIds(),
    })
    .from(examAnswers)
    .innerJoin(words, eq(words.id, examAnswers.wordId))
    .where(eq(examAnswers.sessionId, sessionId))
    .orderBy(asc(examAnswers.id));
  return { session, lenient: (session.options as StoredOptions).lenient, answers };
}

export async function recentExams(limit = 5) {
  return db
    .select({
      id: examSessions.id,
      source: examSessions.source,
      direction: examSessions.direction,
      size: examSessions.size,
      correct: examSessions.correct,
      startedAt: examSessions.startedAt,
      finishedAt: examSessions.finishedAt,
    })
    .from(examSessions)
    .where(and(isNotNull(examSessions.finishedAt), ne(examSessions.size, 0)))
    .orderBy(desc(examSessions.startedAt))
    .limit(limit);
}
