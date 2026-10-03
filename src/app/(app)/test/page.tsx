import type { Metadata } from "next";
import { connection } from "next/server";
import { currentCourse } from "@/server/course";
import { dueCounts } from "@/server/review";
import { libraryStats, listTags } from "@/server/words";
import { TestSetupForm } from "./test-setup-form";

export const metadata: Metadata = { title: "Test me · Duolingo Helper" };

export default async function TestSetupPage({ searchParams }: PageProps<"/test">) {
  await connection();
  const [stats, tags, due, sp, course] = await Promise.all([libraryStats(), listTags(), dueCounts(), searchParams, currentCourse()]);
  const initialSource = sp.source === "due" ? "due" : undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Test me</h1>
      <TestSetupForm
        totalWords={stats.words}
        missedWords={stats.missed}
        due={due}
        tags={tags}
        initialSource={initialSource}
        course={course}
      />
    </main>
  );
}
