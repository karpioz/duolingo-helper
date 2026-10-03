"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelTest, saveExamAsTest } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Add to my tests": saves the exam's words as a personal test (name asked inline). Once saved,
 * or for a run of a personal test, it links to that test instead. The name form takes a row of
 * its own at the end of the parent (which must be a wrapping flex container).
 */
export function SaveAsTestButton({
  examId,
  defaultName,
  savedTestId,
}: {
  examId: number;
  defaultName: string;
  savedTestId: number | null;
}) {
  const [testId, setTestId] = useState(savedTestId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (testId !== null) {
    return (
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/test/personal/${testId}`} />}>
        <BookmarkCheck /> In My tests
      </Button>
    );
  }
  const button = (
    <Button
      variant="outline"
      size="sm"
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
      className="h-9 border-teal bg-transparent px-3.5 font-semibold text-teal hover:bg-teal-soft hover:text-teal"
    >
      <BookmarkPlus /> Add to my tests
    </Button>
  );
  if (!open) return button;
  return (
    <>
      {button}
      <form
      className="order-last flex basis-full flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await saveExamAsTest(examId, name);
          if (res.ok) setTestId(res.testId);
          else setError(res.error);
        });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        aria-label="Test name"
        className="h-8 min-w-0 flex-1 bg-background"
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      <Button type="submit" size="sm" disabled={pending || !name.trim()}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Close
      </Button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
      </form>
    </>
  );
}

/** Two-step cancel; answers so far are kept (see cancelExam). */
export function CancelTestButton({ examId, backTo }: { examId: number; backTo: "test" | "personal" }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="h-9 bg-muted px-4 font-semibold text-muted-foreground hover:bg-secondary"
      >
        Cancel
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Cancel this test? Answers so far are kept.</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        autoFocus
        onClick={() =>
          startTransition(async () => {
            const res = await cancelTest(examId, backTo);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Keep going
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
