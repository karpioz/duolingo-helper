import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { currentCourse } from "@/server/course";
import { PersonalTestForm } from "../personal-test-form";

export const metadata: Metadata = { title: "New test · Duolingo Helper" };

export default async function NewPersonalTestPage() {
  const course = await currentCourse();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <BackLink href="/test/personal">My tests</BackLink>
        <h1 className="text-2xl font-semibold tracking-tight">New test</h1>
      </div>
      <PersonalTestForm course={course} />
    </main>
  );
}
