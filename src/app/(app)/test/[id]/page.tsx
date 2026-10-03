import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ExamSession } from "@/db/schema";
import { defaultTestName, describeExam } from "@/lib/exam-labels";
import { examPersonalTest, getExam, getMatchExam } from "@/server/exams";
import { listTags } from "@/server/words";
import { CancelTestButton, SaveAsTestButton } from "./exam-actions";
import { MatchRunner } from "./match-runner";
import { TestRunner } from "./test-runner";

export const metadata: Metadata = { title: "Test · Duolingo Helper" };

export default async function TestPage({ params }: PageProps<"/test/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const match = await getMatchExam(id);
  if (match) {
    if (match.boardIndex >= match.boards.length) redirect(`/test/${id}/results`);
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <ExamToolbar session={match.session} />
        <MatchRunner examId={id} boards={match.boards} startBoard={match.boardIndex} course={match.session.course} />
      </main>
    );
  }

  const [exam, tags] = await Promise.all([getExam(id), listTags()]);
  if (!exam) notFound();
  if (exam.answered >= exam.questions.length) redirect(`/test/${id}/results`);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <ExamToolbar session={exam.session} />
      <TestRunner
        examId={id}
        questions={exam.questions}
        startIndex={exam.answered}
        startCorrect={exam.session.correct}
        course={exam.session.course}
        tags={tags.filter((t) => t.system).map(({ id, name, color }) => ({ id, name, color }))}
      />
    </main>
  );
}

/** What's running, plus "Add to my tests" and "Cancel". */
function ExamToolbar({ session }: { session: ExamSession }) {
  const { personalTestId, testName } = examPersonalTest(session);
  const label = describeExam({ ...session, testName });
  return (
    <div className="-mb-2 flex flex-wrap items-center gap-1.5">
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</p>
      <SaveAsTestButton examId={session.id} defaultName={defaultTestName(session)} savedTestId={personalTestId} />
      <CancelTestButton examId={session.id} backTo={session.source === "personal" ? "personal" : "test"} />
    </div>
  );
}
