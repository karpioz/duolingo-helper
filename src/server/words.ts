import "server-only";
import { and, asc, count, desc, eq, exists, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { examAnswers, reviewStates, tags, translations, wordTags, words } from "@/db/schema";
import { formatDue } from "@/lib/srs";
import { currentCourse } from "./course";

export const PAGE_SIZE = 100;

export type WordSort = "recent" | "alphabetical";

export type WordRow = {
  id: number;
  text: string;
  audioUrl: string | null;
  translations: string[];
  /** Main meaning picked by the user, if any. */
  preferred: string | null;
  tagIds: number[];
  correct: number;
  wrong: number;
  /** Next review across both directions: "now", "in 3 d", … or null if never practised. */
  due: string | null;
  dueNow: boolean;
};

export type TagWithCount = { id: number; name: string; color: string | null; system: boolean; words: number };

/**
 * words.id, always table-qualified. Drizzle drops the table name in single-table selects, so a
 * plain ${words.id} inside a correlated subquery would bind to the subquery's own "id" column.
 */
export const WORD_ID = sql.raw('"words"."id"');

/** Array of the outer word's translations, primary first. */
export const wordTranslations = () =>
  sql<string[]>`coalesce((select array_agg(t.text order by t.position) from ${translations} t where t.word_id = ${WORD_ID}), '{}')`;

/** Array of the outer word's tag ids. */
export const wordTagIds = () =>
  sql<number[]>`coalesce((select array_agg(wt.tag_id order by wt.tag_id) from ${wordTags} wt where wt.word_id = ${WORD_ID}), '{}')`;

/** Accent- and case-insensitive sort key. */
export const alphaKey = sql`unaccent(lower(${words.text}))`;

function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** The word or one of its translations contains `q` (accent- and case-insensitive for Spanish). */
export function matchesQuery(q: string): SQL {
  const pattern = `%${escapeLike(q)}%`;
  return or(
    sql`unaccent(lower(${words.text})) like unaccent(lower(${pattern}))`,
    exists(
      db
        .select({ one: sql`1` })
        .from(translations)
        .where(and(sql`${translations.wordId} = ${WORD_ID}`, ilike(translations.text, pattern))),
    ),
  )!;
}

export async function listWords(opts: { q?: string; sort?: WordSort; tagId?: number; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const filters: SQL[] = [eq(words.course, await currentCourse())];

  const q = opts.q?.trim();
  if (q) filters.push(matchesQuery(q));
  if (opts.tagId) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(wordTags)
          .where(and(sql`${wordTags.wordId} = ${WORD_ID}`, eq(wordTags.tagId, opts.tagId))),
      ),
    );
  }

  const where = and(...filters);
  const order = opts.sort === "alphabetical" ? [asc(alphaKey)] : [sql`${words.duoRank} asc nulls last`, asc(words.id)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: words.id,
        text: words.text,
        audioUrl: words.audioUrl,
        translations: wordTranslations(),
        preferred: words.preferredTranslation,
        tagIds: wordTagIds(),
        correct: sql<number>`(select count(*)::int from ${examAnswers} a where a.word_id = ${WORD_ID} and a.is_correct)`,
        wrong: sql<number>`(select count(*)::int from ${examAnswers} a where a.word_id = ${WORD_ID} and not a.is_correct)`,
        nextDue: sql<Date | null>`(select min(rs.due) from ${reviewStates} rs where rs.word_id = ${WORD_ID})`,
      })
      .from(words)
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(words).where(where),
  ]);

  const now = new Date();
  const withDue: WordRow[] = rows.map(({ nextDue, ...r }) => {
    const due = nextDue ? new Date(nextDue) : null;
    return { ...r, due: due ? formatDue(due, now) : null, dueNow: !!due && due <= now };
  });
  return { rows: withDue, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/**
 * Sets (or with null, clears) a word's main meaning. Returns false if `text` isn't one of the
 * word's translations.
 */
export async function setPreferredTranslation(wordId: number, text: string | null): Promise<boolean> {
  if (text !== null) {
    const [found] = await db
      .select({ id: translations.id })
      .from(translations)
      .where(and(eq(translations.wordId, wordId), eq(translations.text, text)));
    if (!found) return false;
  }
  await db.update(words).set({ preferredTranslation: text }).where(eq(words.id, wordId));
  return true;
}

/** All tags, with how many words of the current course carry each. */
export async function listTags(): Promise<TagWithCount[]> {
  const course = await currentCourse();
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      system: tags.system,
      words: sql<number>`(select count(*)::int from ${wordTags} wt join ${words} w on w.id = wt.word_id
        where wt.tag_id = ${tags.id} and w.course = ${course})`,
    })
    .from(tags)
    .orderBy(desc(tags.system), asc(tags.id));
}

export async function libraryStats() {
  const course = await currentCourse();
  const [[w], [t], [missed]] = await Promise.all([
    db.select({ n: count() }).from(words).where(eq(words.course, course)),
    db
      .select({ n: count() })
      .from(translations)
      .innerJoin(words, eq(words.id, translations.wordId))
      .where(eq(words.course, course)),
    db
      .execute<{ n: number }>(sql`select count(*)::int as n from (${latestAnswers(course)}) x where not x.is_correct`)
      .then((r) => r.rows),
  ]);
  return { words: w.n, translations: t.n, missed: missed.n };
}

/** Latest answer per word of `course` (any direction): word_id, is_correct, created_at. */
export function latestAnswers(course: string) {
  return sql`select distinct on (a.word_id) a.word_id, a.is_correct, a.created_at
    from ${examAnswers} a join ${words} w on w.id = a.word_id
    where w.course = ${course}
    order by a.word_id, a.created_at desc`;
}
