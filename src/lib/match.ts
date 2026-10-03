/**
 * Match-pairs boards: choosing the English label for a tile and grouping words so that no two
 * words on the same board share a translation (every pairing on a board is unambiguous).
 */
import { normalize, stripAccents, variants } from "./answers";

export const BOARD_SIZE = 5;

/**
 * The translation to show for a word (match tiles, multiple choice options). A main meaning the
 * user picked wins while it's still one of the translations; otherwise `autoLabel` chooses.
 */
export function pickLabel(translations: string[], opts: { spanish?: string; preferred?: string | null } = {}): string {
  if (opts.preferred && translations.includes(opts.preferred)) return opts.preferred;
  return autoLabel(translations, opts.spanish);
}

/** `pickLabel` for a word row. */
export function labelOf(word: { text: string; translations: string[]; preferred?: string | null }): string {
  return pickLabel(word.translations, { spanish: word.text, preferred: word.preferred });
}

/** Translations with the label first, for lists like typed-test prompts. */
export function labelFirst(word: { text: string; translations: string[]; preferred?: string | null }): string[] {
  const label = labelOf(word);
  return [label, ...word.translations.filter((t) => t !== label)];
}

const isHinted = (t: string) => /^\((?!\?)[^)]+\)/.test(t);
const plain = (t: string) => normalize(t.replace(/\([^)]*\)/g, " "));
/** "(?) did you…", possessives, "(since)" fragments, dashes: never a good label. */
const isJunk = (t: string) => {
  const w = plain(t);
  const possessive = /(?<!\b(it|he|she|that|what|how|there|here|who|where|let))'s\b|s'(\s|$)/.test(w);
  return !w || possessive || /\(\?\)|\(since\)|—/.test(t);
};
/** A comparative, superlative or -ly form of another translation ("happier" / "happy"). */
function isDegree(w: string, others: Set<string>): boolean {
  const stems = [w.replace(/(ier|iest)$/, "y"), w.replace(/(er|est|r|st|ly)$/, "")];
  return stems.some((s) => s !== w && others.has(s));
}
/** A plural of another translation ("plants" / "plant"). */
function isPlural(w: string, others: Set<string>): boolean {
  const stems = [w.replace(/s$/, ""), w.replace(/es$/, ""), w.replace(/ies$/, "y")];
  return stems.some((s) => s !== w && others.has(s));
}

/**
 * Scores each translation; Duolingo's order (position) breaks ties. Duolingo's lists mix the
 * meaning with participles, plurals, possessives and fragments, and the first entry is often
 * not the obvious one ("comida": eaten, food, meal).
 *
 * - Hinted verb forms win over plain ones ("(you) learned" pins the person), more so when the
 *   plain form is listed too.
 * - Plain forms lose points for: junk (incl. possessives, but not "how's"), contractions like
 *   "you'll", comparatives of another option, plurals of another option when the Spanish word is
 *   singular, a capitalised echo of the Spanish word ("Rio" for "río"), and "-ed" forms of words
 *   that aren't participles ("designed" for "plan").
 */
export function autoLabel(translations: string[], spanish?: string): string {
  if (translations.length <= 1) return translations[0] ?? "";
  const plains = new Set(translations.filter((t) => !isHinted(t)).map(plain));
  const es = spanish ? stripAccents(normalize(spanish)) : null;
  const spanishPlural = !!es && /s$/.test(es);
  const participle = !es || /([ai]d|t|ch)[ao]s?$/.test(es);
  const anyHinted = translations.some(isHinted);

  let best = translations[0];
  let bestScore = -Infinity;
  translations.forEach((t, position) => {
    const w = plain(t);
    let score = -0.25 * position;
    if (isJunk(t)) score -= 10;
    if (isHinted(t)) score += plains.has(w) ? 3 : 2;
    else {
      if (/'(ll|d|ve)\b|n't\b/.test(w)) score -= 2;
      if (isDegree(w, plains)) score -= 4;
      if (!spanishPlural && isPlural(w, plains)) score -= 3;
      if (/^[A-Z]/.test(t) && stripAccents(w) === es) score -= 3;
      if (!anyHinted && !participle && /ed$/.test(w)) score -= 2;
    }
    if (score > bestScore) [best, bestScore] = [t, score];
  });
  return best;
}

/** Normalized forms of all translations, used to detect overlaps between words. */
export function signature(translations: string[]): Set<string> {
  return new Set(translations.flatMap(variants));
}

export function overlaps(a: Set<string>, b: Set<string>) {
  for (const v of a) if (b.has(v)) return true;
  return false;
}

/**
 * Groups words into boards of up to `size`, first-fit, never putting two words with a shared
 * translation on one board. Keeps the input order within and across boards as far as possible.
 */
export function buildBoards<T extends { translations: string[] }>(items: T[], size = BOARD_SIZE): T[][] {
  const boards: { items: T[]; sigs: Set<string>[] }[] = [];
  for (const item of items) {
    const sig = signature(item.translations);
    const board = boards.find((b) => b.items.length < size && b.sigs.every((s) => !overlaps(s, sig)));
    if (board) {
      board.items.push(item);
      board.sigs.push(sig);
    } else {
      boards.push({ items: [item], sigs: [sig] });
    }
  }

  // Top up a tiny last board (conflicts can leave e.g. 5+4+1) by moving compatible words from
  // boards that can spare one, so no board is trivially easy.
  const last = boards.at(-1);
  if (last && boards.length > 1) {
    while (last.items.length < Math.min(3, size)) {
      let moved = false;
      for (const b of boards) {
        if (b === last || b.items.length <= 3) continue;
        const i = b.sigs.findIndex((s) => last.sigs.every((ls) => !overlaps(s, ls)));
        if (i === -1) continue;
        last.items.push(...b.items.splice(i, 1));
        last.sigs.push(...b.sigs.splice(i, 1));
        moved = true;
        break;
      }
      if (!moved) break;
    }
  }
  return boards.map((b) => b.items);
}

/** Keyboard key for a tile: left column 1–5, right column 6–9 then 0. */
export function tileKey(column: "left" | "right", index: number): string {
  const n = column === "left" ? index + 1 : index + 6;
  return n === 10 ? "0" : String(n);
}

/** Inverse of tileKey. */
export function tileFromKey(key: string, perColumn: number): { column: "left" | "right"; index: number } | null {
  if (!/^[0-9]$/.test(key)) return null;
  const n = key === "0" ? 10 : Number(key);
  if (n >= 1 && n <= perColumn) return { column: "left", index: n - 1 };
  if (n >= 6 && n - 6 < perColumn) return { column: "right", index: n - 6 };
  return null;
}
