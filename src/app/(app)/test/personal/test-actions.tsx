"use client";

import { LoaderCircle, Play, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { removePersonal, startPersonal } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export function StartTestButton({
  id,
  disabled,
  label = "Start",
  overrides,
}: {
  id: number;
  disabled?: boolean;
  /** Tooltip and accessible name, e.g. "Start: Match pairs · Spanish | English". */
  label?: string;
  /** Type and direction for this run only. */
  overrides?: Parameters<typeof startPersonal>[1];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Tooltip label={pending ? "Starting…" : label}>
        <Button
          size="icon"
          className="rounded-full"
          aria-label={label}
          disabled={disabled || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await startPersonal(id, overrides);
              if (res?.error) setError(res.error);
            })
          }
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Play className="translate-x-px fill-current" />}
        </Button>
      </Tooltip>
    </>
  );
}

/** Two-step delete: the first click asks, the second deletes (no browser confirm dialog). */
export function DeleteTestButton({ id, name }: { id: number; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Tooltip label="Delete test">
        <Button variant="destructive" size="icon" aria-label={`Delete ${name}`} onClick={() => setConfirming(true)}>
          <Trash2 />
        </Button>
      </Tooltip>
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
