"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { removePersonal, startPersonal } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function StartTestButton({ id, disabled }: { id: number; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            const res = await startPersonal(id);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Starting…" : "Start"}
      </Button>
    </>
  );
}

/** Two-step delete: the first click asks, the second deletes (no browser confirm dialog). */
export function DeleteTestButton({ id, name }: { id: number; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${name}`}
        title="Delete"
        onClick={() => setConfirming(true)}
      >
        <Trash2 />
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="destructive"
        disabled={pending}
        autoFocus
        onClick={() => startTransition(() => removePersonal(id))}
        onBlur={(e) => {
          if (!pending && !e.currentTarget.parentElement?.contains(e.relatedTarget)) setConfirming(false);
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </>
  );
}
