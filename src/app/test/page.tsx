import type { Metadata } from "next";
import { connection } from "next/server";
import { libraryStats, listTags } from "@/server/words";
import { TestSetupForm } from "./test-setup-form";

export const metadata: Metadata = { title: "Test me · Duolingo Helper" };

export default async function TestSetupPage() {
  await connection();
  const [stats, tags] = await Promise.all([libraryStats(), listTags()]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Test me</h1>
      <TestSetupForm totalWords={stats.words} missedWords={stats.missed} tags={tags} />
    </main>
  );
}
