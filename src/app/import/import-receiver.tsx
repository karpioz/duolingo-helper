"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DUOLINGO_ORIGIN,
  MSG_IMPORT,
  MSG_READY,
  MSG_RESULT,
  type ImportResult,
} from "@/importers/duolingo/protocol";

type Status =
  | { kind: "waiting" }
  | { kind: "saving"; count: number }
  | { kind: "done"; result: ImportResult }
  | { kind: "error"; message: string };

/**
 * Receives words from the collector script on duolingo.com (which opens this page as a popup)
 * and saves them through the import API.
 */
export function ImportReceiver() {
  const [status, setStatus] = useState<Status>({ kind: "waiting" });

  useEffect(() => {
    async function onMessage(event: MessageEvent) {
      if (event.origin !== DUOLINGO_ORIGIN || event.data?.type !== MSG_IMPORT) return;
      const payload = event.data.payload;
      const reply = (message: object) => (event.source as Window | null)?.postMessage(message, event.origin);

      setStatus({ kind: "saving", count: payload?.words?.length ?? 0 });
      try {
        const res = await fetch("/api/import/duolingo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Import failed (${res.status})`);
        setStatus({ kind: "done", result: json });
        reply({ type: MSG_RESULT, ok: true, result: json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message });
        reply({ type: MSG_RESULT, ok: false, error: message });
      }
    }

    window.addEventListener("message", onMessage);
    window.opener?.postMessage({ type: MSG_READY }, DUOLINGO_ORIGIN);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  switch (status.kind) {
    case "waiting":
      return (
        <p className="text-muted-foreground">
          Waiting for words from Duolingo… Run the collector script on{" "}
          <a className="underline" href={`${DUOLINGO_ORIGIN}/practice-hub/words`} target="_blank" rel="noreferrer">
            duolingo.com/practice-hub/words
          </a>{" "}
          and click its “Send to Duolingo Helper” button.
        </p>
      );
    case "saving":
      return <p>Saving {status.count.toLocaleString()} words…</p>;
    case "error":
      return <p className="text-destructive">Import failed: {status.message}</p>;
    case "done": {
      const r = status.result;
      return (
        <div className="space-y-4">
          <p className="font-medium">Import complete.</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{r.received.toLocaleString()} words received ({r.unique.toLocaleString()} unique)</li>
            <li>{r.inserted.toLocaleString()} new, {r.updated.toLocaleString()} updated</li>
            <li>{r.translations.toLocaleString()} translations</li>
          </ul>
          <Button nativeButton={false} render={<Link href="/" />}>Go to library</Button>
        </div>
      );
    }
  }
}
