import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ExamSession } from "@/db/schema";
import { Flag } from "@/components/flag";
import { courseInfo } from "@/lib/courses";
import { defaultTestName, describeExamSource } from "@/lib/exam-labels";
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="flex flex-col gap-6 rounded-[1.75rem] bg-card p-5 shadow-[0_1px_0_var(--border)] sm:p-8">
          <ExamToolbar session={match.session} />
          <MatchRunner examId={id} boards={match.boards} startBoard={match.boardIndex} course={match.session.course} />
        </div>
      </main>
    );
  }

  const [exam, tags] = await Promise.all([getExam(id), listTags()]);
  if (!exam) notFound();
  if (exam.answered >= exam.questions.length) redirect(`/test/${id}/results`);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="flex flex-col gap-6 rounded-[1.75rem] bg-card p-5 shadow-[0_1px_0_var(--border)] sm:p-8">
        <ExamToolbar session={exam.session} />
        <TestRunner
          examId={id}
          questions={exam.questions}
          startIndex={exam.answered}
          startCorrect={exam.session.correct}
          course={exam.session.course}
          tags={tags.filter((t) => t.system).map(({ id, name, color }) => ({ id, name, color }))}
        />
      </div>
    </main>
  );
}

/** What's running, plus "Add to my tests" and "Cancel". */
function ExamToolbar({ session }: { session: ExamSession }) {
  const { personalTestId, testName } = examPersonalTest(session);
  const { learning, from } = courseInfo(session.course);
  const [first, second] = session.direction === "target_to_source" ? [from, learning] : [learning, from];
  return (
    <div className="-mb-2 flex flex-wrap items-center gap-2">
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span className="truncate">{describeExamSource({ ...session, testName })} ·</span>
        <span className="flex items-center gap-1.5">
          <Flag code={first.code} />
          {session.direction === "mixed" ? "⇄" : first.name + " →"}
          <Flag code={second.code} />
          {session.direction === "mixed" ? "Mixed" : second.name}
        </span>
      </p>
      <SaveAsTestButton examId={session.id} defaultName={defaultTestName(session)} savedTestId={personalTestId} />
      <CancelTestButton examId={session.id} backTo={session.source === "personal" ? "personal" : "test"} />
    </div>
  );
}
