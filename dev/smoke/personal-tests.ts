/**
 * Smoke test for personal tests against the database in .env.local: create, list, edit, run as
 * typed and match exams, then delete. Cleans up everything it creates.
 *
 *   npx tsx --conditions=react-server dev/smoke/personal-tests.ts
 */
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  const { db } = await import("@/db");
  const { examSessions } = await import("@/db/schema");
  const { eq, inArray } = await import("drizzle-orm");
  const pt = await import("@/server/personal-tests");
  const exams = await import("@/server/exams");

  const found = await pt.searchWords("comer", "es-en");
  console.log("search 'comer':", found.slice(0, 5).map((w) => w.text));
  assert.ok(found.length > 0);
  const recent = await pt.searchWords("", "es-en");
  assert.equal(recent.length, 20);
  const english = await pt.searchWords("learn", "es-en");
  console.log("search 'learn':", english.slice(0, 5).map((w) => `${w.text} (${w.translations[0]})`));

  const ids = recent.slice(0, 7).map((w) => w.id);
  const input = pt.personalTestSchema.parse({ name: "Smoke test", mode: "typed", direction: "mixed", wordIds: [...ids, ids[0]] });
  assert.equal(input.wordIds.length, 7, "duplicates removed");
  assert.equal(pt.personalTestSchema.safeParse({ ...input, mode: "match", wordIds: [ids[0]] }).success, false);

  const id = (await pt.savePersonalTest(input))!;
  const sessionIds: number[] = [];
  try {
    let t = await pt.getPersonalTest(id);
    assert.deepEqual(t!.words.map((w) => w.id), ids);

    // Edit: reorder, drop one, switch to match.
    const edited = [ids[3], ids[1], ids[2], ids[0], ids[4], ids[5]];
    await pt.savePersonalTest({ ...input, name: "Smoke test 2", mode: "match", wordIds: edited }, id);
    t = await pt.getPersonalTest(id);
    assert.equal(t!.test.name, "Smoke test 2");
    assert.equal(t!.test.mode, "match");
    assert.deepEqual(t!.words.map((w) => w.id), edited);
    assert.equal(await pt.savePersonalTest(input, 999_999_999), null);

    const listed = (await pt.listPersonalTests()).find((x) => x.id === id);
    assert.equal(listed?.words, 6);
    assert.equal(listed?.lastRun, null);

    // Run as match.
    const opts = (mode: "typed" | "match") =>
      exams.examOptionsSchema.parse({ mode, count: pt.MAX_PERSONAL_WORDS, source: "personal", direction: "mixed", personalTestId: id });
    const matchId = (await exams.createExam(opts("match"), { testName: "Smoke test 2" }))!;
    sessionIds.push(matchId);
    const match = await exams.getMatchExam(matchId);
    assert.deepEqual(new Set(match!.boards.flatMap((b) => b.pairs.map((p) => p.wordId))), new Set(edited));
    console.log("match boards:", match!.boards.map((b) => b.pairs.length));

    // Run as typed; mark it finished directly (recording answers would change review schedules).
    const typedId = (await exams.createExam(opts("typed"), { testName: "Smoke test 2" }))!;
    sessionIds.push(typedId);
    const exam = await exams.getExam(typedId);
    assert.equal(exam!.questions.length, 6);
    await db.update(examSessions).set({ finishedAt: new Date(), correct: 4 }).where(eq(examSessions.id, typedId));

    const after = (await pt.listPersonalTests()).find((x) => x.id === id);
    assert.equal(after?.lastRun?.id, typedId);
    assert.equal(after?.lastRun?.correct, 4);
    const results = await exams.getResults(typedId);
    assert.equal(results!.testName, "Smoke test 2");
    const recentRuns = await exams.recentExams(10);
    assert.equal(recentRuns.find((r) => r.id === typedId)?.testName, "Smoke test 2");
  } finally {
    await pt.deletePersonalTest(id);
    assert.equal(await pt.getPersonalTest(id), null);
    if (sessionIds.length) await db.delete(examSessions).where(inArray(examSessions.id, sessionIds));
  }
  console.log("personal tests smoke: OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
