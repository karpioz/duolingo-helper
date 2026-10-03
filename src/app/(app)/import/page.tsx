import type { Metadata } from "next";
import { headers } from "next/headers";
import { collectorScript } from "@/importers/duolingo/collector";
import { DUOLINGO_ORIGIN } from "@/importers/duolingo/protocol";
import { currentCourse } from "@/server/course";
import { CopyButton } from "./copy-button";
import { ImportReceiver } from "./import-receiver";

export const metadata: Metadata = { title: "Import · Duolingo Helper" };

export default async function ImportPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const appUrl = `${proto}://${host}`;
  const [course, script] = await Promise.all([currentCourse(), collectorScript(appUrl)]);
  const urlLine = `window.DUOLINGO_HELPER_URL = ${JSON.stringify(appUrl)};`;
  const wordsPage = `${DUOLINGO_ORIGIN}/practice-hub/words`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-4xl font-extrabold">Import from Duolingo</h1>

      <section className="rounded-2xl bg-card p-5 shadow-[0_1px_0_var(--border)]">
        <ImportReceiver currentCourse={course} />
      </section>

      <section className="space-y-4 rounded-2xl bg-card p-5 shadow-[0_1px_0_var(--border)] sm:p-6">
        <div>
          <h2 className="text-xl font-extrabold">How to import a course</h2>
          <p className="text-sm text-muted-foreground">
            Works for any Duolingo course; each one is kept separately. Re-importing updates words and keeps your
            tags, history and chosen meanings.
          </p>
        </div>
        <ol className="space-y-4">
          <Step n={1} title="Pick the course on Duolingo">
            On duolingo.com, switch your active course to the one you want to import (e.g. Turkish) using the flag
            menu.
          </Step>
          <Step n={2} title="Open your word list">
            Go to{" "}
            <a className="font-semibold text-teal underline underline-offset-2" href={wordsPage} target="_blank" rel="noreferrer">
              duolingo.com/practice-hub/words
            </a>{" "}
            in this browser. If the script later says it couldn’t catch the word list, reload that page and run it
            again.
          </Step>
          <Step n={3} title="Copy the collector script">
            <div className="mt-2">
              <CopyButton text={script} label="Copy script" />
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs">
                It sends the words to this app’s current address. If you run the script from elsewhere (or the
                address changes), put this line before it:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 rounded-lg bg-muted px-2 py-1 text-xs break-all text-foreground">{urlLine}</code>
                <CopyButton text={urlLine} label="Copy" variant="outline" />
              </div>
            </div>
          </Step>
          <Step n={4} title="Run it on the Duolingo tab">
            Open the browser console there (F12, or Ctrl+Shift+J / ⌘⌥J), paste the script and press Enter. Chrome may
            ask you to type <code className="rounded bg-muted px-1 py-0.5 text-xs">allow pasting</code> first.
          </Step>
          <Step n={5} title="Send the words">
            Click the green <b>Send N words to Duolingo Helper</b> button that appears at the top of the Duolingo page.
            A popup opens this page and saves them; allow popups for duolingo.com if it’s blocked.
          </Step>
        </ol>
      </section>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 pt-0.5 text-sm">
        <div className="font-semibold">{title}</div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}
