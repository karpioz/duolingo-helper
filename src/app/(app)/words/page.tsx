import type { Metadata } from "next";
import Link from "next/link";
import { AudioButton } from "@/components/audio-button";
import { Flag } from "@/components/flag";
import { MeaningPicker } from "@/components/meaning-picker";
import { courseInfo } from "@/lib/courses";
import { currentCourse } from "@/server/course";
import { TagToggle } from "@/components/tag-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTags, listWords, type WordSort } from "@/server/words";

export const metadata: Metadata = { title: "Words · Duolingo Helper" };

const selectClass =
  "h-9 rounded-full border border-input bg-card px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function WordsPage({ searchParams }: PageProps<"/words">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = one(sp.q) ?? "";
  const sort: WordSort = one(sp.sort) === "alphabetical" ? "alphabetical" : "recent";
  const tagId = Number(one(sp.tag)) || undefined;
  const page = Number(one(sp.page)) || 1;

  const [{ rows, total, pages }, tags, course] = await Promise.all([
    listWords({ q, sort, tagId, page }),
    listTags(),
    currentCourse(),
  ]);
  const info = courseInfo(course);

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
      <div className="flex items-end justify-between gap-4">
        <h1 className="flex items-center gap-3 text-4xl font-extrabold">
          <Flag code={info.learning.code} className="text-[0.8em]" />
          Words
        </h1>
        <span className="pb-1 text-sm text-muted-foreground tabular-nums">
          {total.toLocaleString()} {info.learning.name} {total === 1 ? "word" : "words"}
        </span>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/words">
        <Input name="q" defaultValue={q} placeholder={`Search ${info.learning.name} or ${info.from.name}…`} className="w-full rounded-full px-4 sm:w-64" />
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
        <Button type="submit">Apply</Button>
        {(q || tagId || sort !== "recent") && (
          <Button variant="ghost" nativeButton={false} render={<Link href="/words" />}>
            Clear
          </Button>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No words match.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {rows.map((w) => (
            <li key={w.id} className="flex items-center gap-3.5 px-4 py-3">
              {w.audioUrl ? <AudioButton url={w.audioUrl} variant="solid" /> : <span className="size-11 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="font-heading text-lg leading-tight font-bold tracking-tight">{w.text}</div>
                <div className="truncate text-sm text-muted-foreground">
                  <MeaningPicker word={w} variant="inline" />
                </div>
              </div>
              {w.due && (
                <span
                  className={
                    w.dueNow
                      ? "shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning ring-1 ring-saffron/40"
                      : "hidden shrink-0 text-xs text-muted-foreground sm:inline"
                  }
                  title="Next spaced-repetition review"
                >
                  {w.dueNow ? "Due now" : `Review ${w.due}`}
                </span>
              )}
              {(w.correct > 0 || w.wrong > 0) && (
                <span className="hidden shrink-0 gap-2 text-xs font-semibold tabular-nums sm:flex" title="Correct / wrong answers">
                  <span className="text-success">✓ {w.correct}</span>
                  <span className="text-danger">✗ {w.wrong}</span>
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
