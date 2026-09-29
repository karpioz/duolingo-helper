/**
 * Match-pairs boards: choosing the English label for a tile and grouping words so that no two
 * words on the same board share a translation (every pairing on a board is unambiguous).
 */
import { variants } from "./answers";

export const BOARD_SIZE = 5;

/**
 * The translation to show on a tile. Prefers a hinted form ("(you) learned") because it pins the
 * verb form; skips "(?)" question forms; falls back to the first translation.
 */
export function pickLabel(translations: string[]): string {
  const plain = translations.filter((t) => !t.includes("(?)"));
  return plain.find((t) => /\(.+\)/.test(t)) ?? plain[0] ?? translations[0] ?? "";
}

/** Normalized forms of all translations, used to detect overlaps between words. */
function signature(translations: string[]): Set<string> {
  return new Set(translations.flatMap(variants));
}

function overlaps(a: Set<string>, b: Set<string>) {
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
