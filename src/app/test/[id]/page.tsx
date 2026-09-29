import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getExam } from "@/server/exams";
import { listTags } from "@/server/words";
import { TestRunner } from "./test-runner";

export const metadata: Metadata = { title: "Test · Duolingo Helper" };

export default async function TestPage({ params }: PageProps<"/test/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [exam, tags] = await Promise.all([getExam(id), listTags()]);
  if (!exam) notFound();
  if (exam.answered >= exam.questions.length) redirect(`/test/${id}/results`);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <TestRunner
        examId={id}
        questions={exam.questions}
        startIndex={exam.answered}
        startCorrect={exam.session.correct}
        tags={tags.filter((t) => t.system).map(({ id, name, color }) => ({ id, name, color }))}
      />
    </main>
  );
}
