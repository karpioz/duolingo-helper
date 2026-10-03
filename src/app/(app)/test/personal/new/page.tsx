import type { Metadata } from "next";
import Link from "next/link";
import { PersonalTestForm } from "../personal-test-form";

export const metadata: Metadata = { title: "New test · Duolingo Helper" };

export default function NewPersonalTestPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="space-y-1">
        <Link href="/test/personal" className="text-sm text-muted-foreground hover:text-foreground">
          ← My tests
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New test</h1>
      </div>
      <PersonalTestForm />
    </main>
  );
}
