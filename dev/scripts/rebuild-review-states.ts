/**
 * Rebuilds all spaced-repetition state by replaying every answer in exam_answers, oldest first.
 * Run after changing scheduler settings, or to backfill history recorded before SRS existed.
 *
 *   npm run srs:rebuild            # uses .env.local (the Neon branch you have checked out)
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  // Imported after dotenv so DATABASE_URL is set.
  const { db } = await import("@/db");
  const { examAnswers, reviewStates } = await import("@/db/schema");
  const { applyReview } = await import("@/server/review");
  const { gradeFor } = await import("@/lib/srs");
  const { asc } = await import("drizzle-orm");

  const answers = await db
    .select({
      wordId: examAnswers.wordId,
      direction: examAnswers.direction,
      isCorrect: examAnswers.isCorrect,
      isAlmost: examAnswers.isAlmost,
      createdAt: examAnswers.createdAt,
    })
    .from(examAnswers)
    .orderBy(asc(examAnswers.createdAt), asc(examAnswers.id));

  const cards = await db.transaction(async (tx) => {
    await tx.delete(reviewStates);
    for (const a of answers) {
      const kind = !a.isCorrect ? "wrong" : a.isAlmost ? "almost" : "exact";
      await applyReview(tx, { wordId: a.wordId, direction: a.direction, grade: gradeFor(kind), correct: a.isCorrect, at: a.createdAt });
    }
    return (await tx.select({ wordId: reviewStates.wordId }).from(reviewStates)).length;
  });

  console.log(`Replayed ${answers.length} answers into ${cards} review cards (word × direction).`);
  const { pool } = await import("@/db");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
