import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { translations, words } from "@/db/schema";
import type { DuolingoImport, ImportResult } from "./protocol";

const WORD_CHUNK = 500;
const TRANSLATION_CHUNK = 2000;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Upserts words by (course, text). Re-importing is safe: existing words keep their id, tags and
 * review history; audio URL and Duolingo rank are refreshed and translations are replaced.
 */
export async function saveDuolingoImport(data: DuolingoImport): Promise<ImportResult> {
  // Deduplicate by text, keeping the first (most recently learned) occurrence.
  const byText = new Map<string, { text: string; translations: string[]; audioUrl: string | null; rank: number }>();
  for (const w of data.words) {
    if (byText.has(w.text)) continue;
    const unique = [...new Set(w.translations.filter(Boolean))];
    byText.set(w.text, { text: w.text, translations: unique, audioUrl: w.audioURL ?? null, rank: byText.size });
  }
  const incoming = [...byText.values()];

  return db.transaction(async (tx) => {
    let inserted = 0;
    const idByText = new Map<string, number>();

    for (const chunk of chunks(incoming, WORD_CHUNK)) {
      const rows = await tx
        .insert(words)
        .values(
          chunk.map((w) => ({ course: data.course, text: w.text, audioUrl: w.audioUrl, duoRank: w.rank, source: "duolingo" })),
        )
        .onConflictDoUpdate({
          target: [words.course, words.text],
          set: { audioUrl: sql`excluded.audio_url`, duoRank: sql`excluded.duo_rank`, updatedAt: sql`now()` },
        })
        // xmax = 0 only for freshly inserted rows, not for conflict updates.
        .returning({ id: words.id, text: words.text, inserted: sql<boolean>`(xmax = 0)` });

      for (const r of rows) {
        idByText.set(r.text, r.id);
        if (r.inserted) inserted++;
      }
    }

    const ids = [...idByText.values()];
    for (const chunk of chunks(ids, WORD_CHUNK)) {
      await tx.delete(translations).where(inArray(translations.wordId, chunk));
    }

    const translationRows = incoming.flatMap((w) =>
      w.translations.map((text, position) => ({ wordId: idByText.get(w.text)!, text, position })),
    );
    for (const chunk of chunks(translationRows, TRANSLATION_CHUNK)) {
      await tx.insert(translations).values(chunk);
    }

    return {
      course: data.course,
      received: data.words.length,
      unique: incoming.length,
      inserted,
      updated: incoming.length - inserted,
      translations: translationRows.length,
    };
  });
}
