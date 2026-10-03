import "server-only";
import { and, asc, desc, eq, exists, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examAnswers, examSessions, reviewStates, translations, wordTags, words } from "@/db/schema";
import { checkAnswer, type CheckResult, type MatchKind } from "@/lib/answers";
import { optionLabel, pickDistractors } from "@/lib/choice";
import { buildBoards, pickLabel } from "@/lib/match";
import { gradeFor } from "@/lib/srs";
import { personalTestWordIds } from "./personal-tests";
import { applyReview } from "./review";
import { COURSE, WORD_ID, alphaKey, latestAnswers, wordTagIds, wordTranslations } from "./words";

export type Direction = "source_to_target" | "target_to_source";

export const examOptionsSchema = z.object({
  mode: z.enum(["typed", "choice", "match"]).default("typed"),
  count: z.coerce.number().int().min(1).max(200),
  source: z.enum(["recent", "alphabetical", "random", "tagged", "missed", "due", "retest", "personal"]),
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
  /** Personal only: the test to run. */
  personalTestId: z.number().int().optional(),
});
export type ExamOptions = z.infer<typeof examOptionsSchema>;

type Question = {
  wordId: number;
  direction: Direction;
  /** Multiple choice: word ids of the options in display order (the answer is one of them). */
  choices?: number[];
};
type StoredOptions = Pick<ExamOptions, "lenient" | "tagIds" | "startLetter" | "personalTestId"> & {
  /** Personal tests: the test's name when the exam started. */
  testName?: string;
  questions: Question[];
  /** Match mode: number of pairs on each board, in question order. */
  boards?: number[];
};

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
    case "due":
      return (await dueWords(o)).map((d) => d.wordId);
    case "retest":
      return o.wordIds.slice(0, o.count);
    case "personal":
      return o.personalTestId === undefined ? [] : (await personalTestWordIds(o.personalTestId)).slice(0, o.count);
  }
}

/**
 * Words due for review, most overdue first, one entry per word (its most overdue direction).
 * A fixed exam direction only considers that direction.
 */
async function dueWords(o: ExamOptions): Promise<{ wordId: number; direction: Direction }[]> {
  const dir = o.direction === "mixed" ? sql`true` : sql`rs.direction = ${o.direction}`;
  const res = await db.execute<{ word_id: number; direction: Direction }>(sql`
    select word_id, direction from (
      select distinct on (rs.word_id) rs.word_id, rs.direction, rs.due
      from ${reviewStates} rs join ${words} w on w.id = rs.word_id
      where w.course = ${COURSE} and rs.due <= now() and ${dir}
      order by rs.word_id, rs.due
    ) x order by due limit ${o.count}`);
  return res.rows.map((r) => ({ wordId: r.word_id, direction: r.direction }));
}

const randomDirection = (): Direction => (Math.random() < 0.5 ? "source_to_target" : "target_to_source");

/** Creates an exam session; returns its id, or null if no words match. */
export async function createExam(o: ExamOptions, extra: { testName?: string } = {}): Promise<number | null> {
  // Due reviews keep their order (most overdue first) and the direction that is due.
  const due = o.source === "due" ? await dueWords(o) : null;
  const dueDirection = new Map(due?.map((d) => [d.wordId, d.direction]));
  const wordIds = due ? due.map((d) => d.wordId) : shuffle(await pickWordIds(o));
  if (wordIds.length === 0) return null;
  const fixed = o.direction === "mixed" ? null : o.direction;

  let questions: Question[];
  let boards: number[] | undefined;
  if (o.mode === "match") {
    // Group into boards with no shared translations; mixed = one direction per board.
    const rows = await db
      .select({ id: words.id, translations: wordTranslations() })
      .from(words)
      .where(inArray(words.id, wordIds));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const grouped = buildBoards(wordIds.filter((id) => byId.has(id)).map((id) => byId.get(id)!));
    boards = grouped.map((b) => b.length);
    questions = grouped.flatMap((board) => {
      const direction = fixed ?? randomDirection();
      return board.map((w) => ({ wordId: w.id, direction }));
    });
  } else {
    questions = wordIds.map((wordId) => ({ wordId, direction: dueDirection.get(wordId) ?? fixed ?? randomDirection() }));
    if (o.mode === "choice") questions = await withChoices(questions);
  }

  const options: StoredOptions = {
    lenient: o.lenient,
    tagIds: o.tagIds,
    startLetter: o.startLetter,
    personalTestId: o.personalTestId,
    testName: extra.testName,
    questions,
    boards,
  };
  const [session] = await db
    .insert(examSessions)
    .values({ course: COURSE, mode: o.mode, direction: o.direction, source: o.source, size: questions.length, options })
    .returning({ id: examSessions.id });
  return session.id;
}

/** Adds options to each question, drawn from the whole course so there's plenty to choose from. */
async function withChoices(questions: Question[]): Promise<Question[]> {
  const pool = await db
    .select({ id: words.id, text: words.text, translations: wordTranslations() })
    .from(words)
    .where(eq(words.course, COURSE));
  const byId = new Map(pool.map((w) => [w.id, w]));
  return questions
    .filter((q) => byId.has(q.wordId))
    .map((q) => {
      const distractors = pickDistractors(byId.get(q.wordId)!, pool, q.direction === "target_to_source");
      return { ...q, choices: shuffle([q.wordId, ...distractors]) };
    });
}

export type ExamQuestion = {
  wordId: number;
  direction: Direction;
  /** Spanish word (source_to_target) or its English translations (target_to_source). */
  prompt: string[];
  audioUrl: string | null;
  tagIds: number[];
  /** Multiple choice: the options' text, in display order. */
  choices?: string[];
};

export async function getExam(id: number) {
  const [session] = await db.select().from(examSessions).where(eq(examSessions.id, id));
  if (!session) return null;
  const options = session.options as StoredOptions;

  const wordIds = [...new Set(options.questions.flatMap((q) => [q.wordId, ...(q.choices ?? [])]))];
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

  const kept = options.questions.filter((q) => byId.has(q.wordId));
  /** Index of the right option per question (multiple choice). Server-only: not sent to the page. */
  const choiceAnswers = kept.map((q) => q.choices?.filter((id) => byId.has(id)).indexOf(q.wordId));
  const questions: ExamQuestion[] = kept.map((q) => {
    const w = byId.get(q.wordId)!;
    const answerInSpanish = q.direction === "target_to_source";
    return {
      wordId: q.wordId,
      direction: q.direction,
      prompt: answerInSpanish ? w.translations : [w.text],
      audioUrl: w.audioUrl,
      tagIds: w.tagIds,
      choices: q.choices?.filter((id) => byId.has(id)).map((id) => optionLabel(byId.get(id)!, answerInSpanish)),
    };
  });

  const [{ answered }] = await db
    .select({ answered: sql<number>`count(*)::int` })
    .from(examAnswers)
    .where(eq(examAnswers.sessionId, id));

  return { session, lenient: options.lenient, questions, choiceAnswers, answered };
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
  /** Multiple choice: index of the right option. */
  correctChoice?: number;
  /** When this word comes back for review in this direction (ISO). */
  nextDue: string;
};

/**
 * Saves the answer to question `index`. Typed tests pass the text; multiple choice passes the
 * index of the chosen option (null = "I don't know").
 */
export async function recordAnswer(
  sessionId: number,
  index: number,
  answer: { text: string } | { choice: number | null },
  responseMs: number | null,
) {
  const exam = await getExam(sessionId);
  if (!exam) throw new Error("Exam not found.");
  if (index !== exam.answered) throw new Error("Answer out of order: reload the page.");
  const question = exam.questions[index];
  if (!question) throw new Error("No such question.");

  const [word] = await db
    .select({ text: words.text, translations: wordTranslations() })
    .from(words)
    .where(eq(words.id, question.wordId));

  let given: string;
  let check: CheckResult;
  let alternatives: string[] = [];
  let correctChoice: number | undefined;
  if ("choice" in answer) {
    if (!question.choices) throw new Error("Not a multiple choice question.");
    correctChoice = exam.choiceAnswers[index];
    given = answer.choice === null ? "" : (question.choices[answer.choice] ?? "");
    check = { kind: answer.choice === correctChoice ? "exact" : "wrong" };
  } else {
    given = answer.text;
    let accepted: string[];
    if (question.direction === "source_to_target") {
      accepted = word.translations;
    } else {
      alternatives = await alternativeWords(question.wordId);
      accepted = [word.text, ...alternatives];
    }
    check = checkAnswer(given, accepted, { lenient: exam.lenient });
  }
  const isCorrect = check.kind !== "wrong";
  const isLast = index === exam.questions.length - 1;

  const nextDue = await db.transaction(async (tx) => {
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
    return applyReview(tx, {
      wordId: question.wordId,
      direction: question.direction,
      grade: gradeFor(check.kind),
      correct: isCorrect,
      at: new Date(),
    });
  });

  return {
    kind: check.kind,
    matched: check.matched,
    alternative: !!check.matched && alternatives.includes(check.matched),
    word: word.text,
    translations: word.translations,
    isLast,
    correctChoice,
    nextDue: nextDue.toISOString(),
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
  const options = session.options as StoredOptions;
  return { session, lenient: options.lenient, testName: options.testName, answers };
}

export async function recentExams(limit = 5) {
  return db
    .select({
      id: examSessions.id,
      source: examSessions.source,
      direction: examSessions.direction,
      mode: examSessions.mode,
      size: examSessions.size,
      correct: examSessions.correct,
      startedAt: examSessions.startedAt,
      finishedAt: examSessions.finishedAt,
      testName: sql<string | null>`${examSessions.options}->>'testName'`,
    })
    .from(examSessions)
    .where(and(isNotNull(examSessions.finishedAt), ne(examSessions.size, 0)))
    .orderBy(desc(examSessions.startedAt))
    .limit(limit);
}

export type MatchPair = { wordId: number; spanish: string; english: string; audioUrl: string | null };
/** `rightOrder[j]` = index into `pairs` of the j-th tile in the right column (shuffled). */
export type MatchBoard = { direction: Direction; pairs: MatchPair[]; rightOrder: number[] };

/** Shuffled 0..n-1 that never matches the left column's order (n > 1), so rows never line up. */
function shuffleUnlikeIdentity(n: number): number[] {
  const order = shuffle(Array.from({ length: n }, (_, i) => i));
  const identity = order.every((v, i) => v === i);
  return identity && n > 1 ? [...order.slice(1), order[0]] : order;
}

function boardSizes(options: StoredOptions) {
  if (options.boards?.length) return options.boards;
  const sizes: number[] = [];
  for (let i = 0; i < options.questions.length; i += 5) sizes.push(Math.min(5, options.questions.length - i));
  return sizes;
}

/** A match-pairs exam split into boards, plus the board to resume at. */
export async function getMatchExam(id: number) {
  const [session] = await db.select().from(examSessions).where(eq(examSessions.id, id));
  if (!session || session.mode !== "match") return null;
  const options = session.options as StoredOptions;

  const rows = await db
    .select({ id: words.id, text: words.text, audioUrl: words.audioUrl, translations: wordTranslations() })
    .from(words)
    .where(inArray(words.id, options.questions.map((q) => q.wordId)));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const boards: MatchBoard[] = [];
  let start = 0;
  for (const size of boardSizes(options)) {
    const qs = options.questions.slice(start, start + size);
    start += size;
    const pairs = qs
        .filter((q) => byId.has(q.wordId))
        .map((q) => {
          const w = byId.get(q.wordId)!;
          return { wordId: w.id, spanish: w.text, english: pickLabel(w.translations), audioUrl: w.audioUrl };
        });
    boards.push({
      direction: qs[0]?.direction ?? "source_to_target",
      pairs,
      rightOrder: shuffleUnlikeIdentity(pairs.length),
    });
  }

  const [{ answered }] = await db
    .select({ answered: sql<number>`count(*)::int` })
    .from(examAnswers)
    .where(eq(examAnswers.sessionId, id));

  // Boards are saved whole, so `answered` is always a board boundary.
  let boardIndex = 0;
  for (let n = 0; boardIndex < boards.length && n < answered; boardIndex++) n += boardSizes(options)[boardIndex];

  return { session, boards, boardIndex, answered };
}

/** Saves one finished board: a word counts as correct if it was never part of a wrong pairing. */
export async function recordMatchBoard(
  sessionId: number,
  boardIndex: number,
  results: { wordId: number; mistakes: number }[],
  elapsedMs: number | null,
) {
  const exam = await getMatchExam(sessionId);
  if (!exam) throw new Error("Match exam not found.");
  if (boardIndex !== exam.boardIndex) throw new Error("Board out of order: reload the page.");
  const board = exam.boards[boardIndex];
  if (!board) throw new Error("No such board.");

  const expected = new Set(board.pairs.map((p) => p.wordId));
  if (results.length !== expected.size || !results.every((r) => expected.has(r.wordId))) {
    throw new Error("Board results don't match the board.");
  }

  const correct = results.filter((r) => r.mistakes === 0).length;
  const isLast = boardIndex === exam.boards.length - 1;
  const perWordMs = elapsedMs == null ? null : Math.round(elapsedMs / results.length);

  await db.transaction(async (tx) => {
    await tx.insert(examAnswers).values(
      results.map((r) => ({
        sessionId,
        wordId: r.wordId,
        direction: board.direction,
        given: null,
        isCorrect: r.mistakes === 0,
        responseMs: perWordMs,
      })),
    );
    const changes = {
      ...(correct ? { correct: sql`${examSessions.correct} + ${correct}` } : {}),
      ...(isLast ? { finishedAt: new Date() } : {}),
    };
    if (Object.keys(changes).length > 0) {
      await tx.update(examSessions).set(changes).where(eq(examSessions.id, sessionId));
    }
    const at = new Date();
    for (const r of results) {
      const ok = r.mistakes === 0;
      await applyReview(tx, { wordId: r.wordId, direction: board.direction, grade: gradeFor(ok ? "exact" : "wrong"), correct: ok, at });
    }
  });

  return { correct, isLast };
}
