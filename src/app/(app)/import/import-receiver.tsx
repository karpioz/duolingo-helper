"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { switchCourse } from "@/app/actions";
import { Flag } from "@/components/flag";
import { Button } from "@/components/ui/button";
import { courseInfo } from "@/lib/courses";
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
export function ImportReceiver({ currentCourse }: { currentCourse: string }) {
  const [status, setStatus] = useState<Status>({ kind: "waiting" });
  const [switching, startSwitch] = useTransition();
  const [switched, setSwitched] = useState(false);

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
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-saffron" aria-hidden />
          Waiting for words from Duolingo… Follow the steps below; this page fills in when they arrive.
        </p>
      );
    case "saving":
      return <p>Saving {status.count.toLocaleString()} words…</p>;
    case "error":
      return <p className="text-destructive">Import failed: {status.message}</p>;
    case "done": {
      const r = status.result;
      const info = courseInfo(r.course);
      const other = r.course !== currentCourse && !switched;
      return (
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-medium">
            <Flag code={info.learning.code} /> {info.learning.name} from {info.from.name}: import complete.
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{r.received.toLocaleString()} words received ({r.unique.toLocaleString()} unique)</li>
            <li>{r.inserted.toLocaleString()} new, {r.updated.toLocaleString()} updated</li>
            <li>{r.translations.toLocaleString()} translations</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {other && (
              <Button
                disabled={switching}
                onClick={() => startSwitch(async () => {
                  await switchCourse(r.course);
                  setSwitched(true);
                })}
              >
                Switch to {info.learning.name}
              </Button>
            )}
            <Button variant={other ? "outline" : "default"} nativeButton={false} render={<Link href="/" />}>
              Go to library
            </Button>
          </div>
        </div>
      );
    }
  }
}
