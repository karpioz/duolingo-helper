import type { Metadata } from "next";
import Link from "next/link";
import { AudioButton } from "@/components/audio-button";
import { TagToggle } from "@/components/tag-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayAnswer } from "@/lib/answers";
import { listTags, listWords, type WordSort } from "@/server/words";

export const metadata: Metadata = { title: "Words · Duolingo Helper" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function WordsPage({ searchParams }: PageProps<"/words">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = one(sp.q) ?? "";
  const sort: WordSort = one(sp.sort) === "alphabetical" ? "alphabetical" : "recent";
  const tagId = Number(one(sp.tag)) || undefined;
  const page = Number(one(sp.page)) || 1;

  const [{ rows, total, pages }, tags] = await Promise.all([listWords({ q, sort, tagId, page }), listTags()]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort !== "recent") params.set("sort", sort);
    if (tagId) params.set("tag", String(tagId));
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/words?${s}` : "/words";
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Words</h1>
        <span className="text-sm text-muted-foreground tabular-nums">{total.toLocaleString()} shown</span>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/words">
        <Input name="q" defaultValue={q} placeholder="Search Spanish or English…" className="w-full sm:w-64" />
        <select name="sort" defaultValue={sort} className={selectClass} aria-label="Sort">
          <option value="recent">Recently learned</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
        <select name="tag" defaultValue={tagId ?? ""} className={selectClass} aria-label="Tag">
          <option value="">All words</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              Tagged {t.name} ({t.words})
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {(q || tagId || sort !== "recent") && (
          <Button variant="ghost" nativeButton={false} render={<Link href="/words" />}>
            Clear
          </Button>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No words match.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-3 py-2.5">
              <AudioButton url={w.audioUrl} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{w.text}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {w.translations.map(displayAnswer).join(", ")}
                </div>
              </div>
              {w.due && (
                <span
                  className={w.dueNow ? "text-xs font-medium text-amber-600 dark:text-amber-400" : "hidden text-xs text-muted-foreground sm:inline"}
                  title="Next spaced-repetition review"
                >
                  {w.dueNow ? "Due now" : `Review ${w.due}`}
                </span>
              )}
              {(w.correct > 0 || w.wrong > 0) && (
                <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline" title="Correct / wrong answers">
                  ✓{w.correct} ✗{w.wrong}
                </span>
              )}
              <div className="flex shrink-0 gap-1.5">
                {tags.map((t) => (
                  <TagToggle key={t.id} wordId={w.id} tag={t} on={w.tagIds.includes(t.id)} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button variant="outline" nativeButton={false} render={<Link href={hrefFor(page - 1)} />}>
              ← Previous
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button variant="outline" nativeButton={false} render={<Link href={hrefFor(page + 1)} />}>
              Next →
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
