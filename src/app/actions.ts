"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { wordTags } from "@/db/schema";
import { createExam, examOptionsSchema, recordAnswer, recordMatchBoard, type AnswerResult } from "@/server/exams";

export async function toggleWordTag(wordId: number, tagId: number, on: boolean): Promise<void> {
  const ids = z.object({ wordId: z.number().int(), tagId: z.number().int() }).parse({ wordId, tagId });
  if (on) {
    await db.insert(wordTags).values(ids).onConflictDoNothing();
  } else {
    await db.delete(wordTags).where(and(eq(wordTags.wordId, ids.wordId), eq(wordTags.tagId, ids.tagId)));
  }
}

export async function startExam(input: unknown): Promise<{ error: string }> {
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
    const result = await recordAnswer(sessionId, index, String(given ?? ""), responseMs);
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
