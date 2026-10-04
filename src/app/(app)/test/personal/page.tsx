import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { currentCourse } from "@/server/course";
import { listPersonalTests } from "@/server/personal-tests";
import { TestRow } from "./test-row";

export const metadata: Metadata = { title: "My tests · Duolingo Helper" };

export default async function MyTestsPage() {
  const [tests, course] = await Promise.all([listPersonalTests(), currentCourse()]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <BackLink href="/test">Test me</BackLink>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">My tests</h1>
          <Button nativeButton={false} render={<Link href="/test/personal/new" />}>
            New test
          </Button>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No personal tests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the words you want to practise and save them as a test you can run any time.
          </p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/test/personal/new" />}>
            Create your first test
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {tests.map((t) => (
            <TestRow
              key={t.id}
              course={course}
              test={{
                ...t,
                lastRun: t.lastRun && {
                  ...t.lastRun,
                  date: t.lastRun.at.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                },
              }}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
