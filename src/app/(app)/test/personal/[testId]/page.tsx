import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonalTest } from "@/server/personal-tests";
import { PersonalTestForm } from "../personal-test-form";

export const metadata: Metadata = { title: "Edit test · Duolingo Helper" };

export default async function EditPersonalTestPage({ params }: PageProps<"/test/personal/[testId]">) {
  const id = Number((await params).testId);
  if (!Number.isInteger(id)) notFound();
  const found = await getPersonalTest(id);
  if (!found) notFound();
  const { test, words } = found;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="space-y-1">
        <Link href="/test/personal" className="text-sm text-muted-foreground hover:text-foreground">
          ← My tests
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit test</h1>
      </div>
      <PersonalTestForm
        id={test.id}
        initial={{ name: test.name, mode: test.mode === "match" ? "match" : "typed", direction: test.direction, words }}
      />
    </main>
  );
}
