"use client";

import { useState, useTransition } from "react";
import { startExam } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function RetestButton({
  wordIds,
  direction,
  mode,
  lenient,
  label,
}: {
  wordIds: number[];
  direction: "source_to_target" | "target_to_source" | "mixed";
  mode: "typed" | "match";
  lenient: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await startExam({ mode, count: wordIds.length, source: "retest", direction, lenient, wordIds });
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Starting…" : label}
      </Button>
      {error && <span className="self-center text-sm text-destructive">{error}</span>}
    </>
  );
}
