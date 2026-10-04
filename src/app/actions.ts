"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { examSessions, wordTags } from "@/db/schema";
import { isCourseId } from "@/lib/courses";
import { COURSE_COOKIE } from "@/server/course";
import { assertUser } from "@/server/session";
import { setPreferredTranslation } from "@/server/words";
import { cancelExam, createExam, examOptionsSchema, recordAnswer, recordMatchBoard, type AnswerResult } from "@/server/exams";
import {
  MAX_PERSONAL_WORDS,
  deletePersonalTest,
  getPersonalTest,
  personalTestSchema,
  savePersonalFromExam,
  savePersonalTest,
  searchWords,
  type PickedWord,
} from "@/server/personal-tests";

export async function toggleWordTag(wordId: number, tagId: number, on: boolean): Promise<void> {
  await assertUser();
  const ids = z.object({ wordId: z.number().int(), tagId: z.number().int() }).parse({ wordId, tagId });
  if (on) {
    await db.insert(wordTags).values(ids).onConflictDoNothing();
  } else {
    await db.delete(wordTags).where(and(eq(wordTags.wordId, ids.wordId), eq(wordTags.tagId, ids.tagId)));
  }
}

export async function startExam(input: unknown): Promise<{ error: string }> {
  try {
    await assertUser();
  } catch {
    return { error: "You are signed out. Reload the page and sign in." };
  }
  const parsed = examOptionsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid test options." };
  const id = await createExam(parsed.data);
  if (id === null) return { error: "No words match these options." };
  redirect(`/test/${id}`);
}

export async function submitAnswer(
  sessionId: number,
  index: number,
  given: string,
  responseMs: number | null,
): Promise<{ ok: true; result: AnswerResult } | { ok: false; error: string }> {
  try {
    await assertUser();
    const result = await recordAnswer(sessionId, index, { text: String(given ?? "") }, responseMs);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save the answer." };
  }
}

/** Multiple choice: `choice` is the index of the picked option, or null for "I don't know". */
export async function submitChoice(
  sessionId: number,
  index: number,
  choice: number | null,
  responseMs: number | null,
): Promise<{ ok: true; result: AnswerResult } | { ok: false; error: string }> {
  try {
    await assertUser();
    const picked = z.number().int().min(0).max(9).nullable().parse(choice);
    const result = await recordAnswer(sessionId, index, { choice: picked }, responseMs);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save the answer." };
  }
}

export async function submitMatchBoard(
  sessionId: number,
  boardIndex: number,
  results: { wordId: number; mistakes: number }[],
  elapsedMs: number | null,
): Promise<{ ok: true; isLast: boolean } | { ok: false; error: string }> {
  try {
    await assertUser();
    const parsed = z
      .array(z.object({ wordId: z.number().int(), mistakes: z.number().int().min(0) }))
      .max(10)
      .parse(results);
    const { isLast } = await recordMatchBoard(sessionId, boardIndex, parsed, elapsedMs);
    return { ok: true, isLast };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save the board." };
  }
}

/** Sets a word's main meaning (one of its translations), or clears it with null. */
export async function setMainMeaning(wordId: number, text: string | null): Promise<{ ok: boolean }> {
  await assertUser();
  const id = z.number().int().parse(wordId);
  const meaning = z.string().max(500).nullable().parse(text);
  return { ok: await setPreferredTranslation(id, meaning) };
}

/** Test creator: words of `course` matching `q` (recently learned words when empty). */
export async function findWords(q: string, course: string): Promise<PickedWord[]> {
  await assertUser();
  return searchWords(z.string().max(100).catch("").parse(q), z.string().refine(isCourseId).parse(course));
}

/** Switches the course everything is shown for (remembered in a cookie for a year). */
export async function switchCourse(course: string): Promise<void> {
  await assertUser();
  const id = z.string().refine(isCourseId).parse(course);
  (await cookies()).set(COURSE_COOKIE, id, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}

/**
 * Creates (no `id`) or updates a personal test. Then goes back to My tests, or straight into a
 * run of it with `start`.
 */
export async function savePersonal(
  input: unknown,
  id: number | null,
  start: boolean,
): Promise<{ error: string }> {
  try {
    await assertUser();
  } catch {
    return { error: "You are signed out. Reload the page and sign in." };
  }
  const parsed = personalTestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid test." };
  const testId = await savePersonalTest(parsed.data, id ?? undefined);
  if (testId === null) return { error: "This test no longer exists." };
  revalidatePath("/test/personal");
  if (start) return startPersonal(testId);
  redirect("/test/personal");
}

export async function removePersonal(id: number): Promise<void> {
  await assertUser();
  await deletePersonalTest(z.number().int().parse(id));
  revalidatePath("/test/personal");
}

const runOverridesSchema = z
  .object({
    mode: z.enum(["typed", "match"]).optional(),
    direction: z.enum(["source_to_target", "target_to_source", "mixed"]).optional(),
  })
  .default({});

/**
 * Runs a personal test with all of its words. Type and direction come from the test unless
 * `overrides` picks others for this run only; the saved test is not changed.
 */
export async function startPersonal(
  id: number,
  overrides?: { mode?: "typed" | "match"; direction?: "source_to_target" | "target_to_source" | "mixed" },
): Promise<{ error: string }> {
  try {
    await assertUser();
  } catch {
    return { error: "You are signed out. Reload the page and sign in." };
  }
  const found = await getPersonalTest(z.number().int().parse(id));
  if (!found) return { error: "This test no longer exists." };
  const { test } = found;
  const run = runOverridesSchema.parse(overrides);
  const mode = run.mode ?? test.mode;
  if (mode === "match" && found.words.length < 2) return { error: "Match pairs needs at least 2 words." };
  const examId = await createExam(
    examOptionsSchema.parse({
      mode,
      count: MAX_PERSONAL_WORDS,
      source: "personal",
      direction: run.direction ?? test.direction,
      personalTestId: test.id,
      course: test.course,
    }),
    { testName: test.name },
  );
  if (examId === null) return { error: "This test has no words." };
  redirect(`/test/${examId}`);
}

/** Saves a generated exam's words as a personal test, so it can be run again. */
export async function saveExamAsTest(
  examId: number,
  name: string,
): Promise<{ ok: true; testId: number } | { ok: false; error: string }> {
  try {
    await assertUser();
    const [session] = await db.select().from(examSessions).where(eq(examSessions.id, z.number().int().parse(examId)));
    if (!session) return { ok: false, error: "This test no longer exists." };
    const parsed = z.string().trim().min(1, "Give the test a name.").max(100).safeParse(name);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const testId = await savePersonalFromExam(session, parsed.data);
    revalidatePath("/test/personal");
    return { ok: true, testId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save the test." };
  }
}

/** Cancels an unfinished exam and leaves it: back to My tests for personal tests, else Test me. */
export async function cancelTest(examId: number, backTo: "test" | "personal"): Promise<{ error: string }> {
  try {
    await assertUser();
  } catch {
    return { error: "You are signed out. Reload the page and sign in." };
  }
  const res = await cancelExam(z.number().int().parse(examId));
  if (!res) return { error: "This test no longer exists." };
  redirect(backTo === "personal" ? "/test/personal" : "/test");
}
