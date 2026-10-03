/**
 * Multiple choice: picking wrong options (distractors) for a word. Pure functions, no DB.
 *
 * A distractor must never be a valid answer too, so it can't share a translation with the target
 * (same rule as match-pairs boards), nor with another distractor (two options that mean the same
 * thing give the game away). No option may contain another either ("beautiful" / "so beautiful").
 *
 * Among the rest, options that look like the answer are preferred: the same English hint
 * ("(you) learned" / "(you) ate": same person and tense), the same ending ("aprendiste" /
 * "comiste"), the same number of words and a similar length.
 */
import { normalize } from "./answers";
import { labelOf, overlaps, signature } from "./match";

export const CHOICE_COUNT = 4;

export type ChoiceWord = { id: number; text: string; translations: string[]; preferred?: string | null };

/** What an option shows: the Spanish word when answering in Spanish, else its English label. */
export function optionLabel(word: Omit<ChoiceWord, "id">, answerInSpanish: boolean): string {
  return answerInSpanish ? word.text : labelOf(word);
}

function commonSuffix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

/** The hint in front of an English label: "(you) learned" → "you", "woman" → null. */
export function hintOf(word: Omit<ChoiceWord, "id">): string | null {
  return /^\(([^)?]+)\)/.exec(labelOf(word))?.[1].trim().toLowerCase() ?? null;
}

/** Same person/tense (both hinted alike) is a strong signal; a hinted verb vs a plain noun is not. */
function hintScore(target: string | null, candidate: string | null): number {
  if (target === candidate) return target ? 4 : 0;
  return target && candidate ? 1 : -2;
}

/** Label without hints, for comparing meaning: "(you) learned" → "learned". */
const bare = (label: string) => normalize(label.replace(/\([^)]*\)/g, " "));

/** "so beautiful" vs "beautiful": one contains the other as whole words, so both are near-right. */
function contains(a: string, b: string): boolean {
  return ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);
}

/** How much `candidate` looks like `target` (higher = more plausible as a wrong answer). */
export function similarity(target: string, candidate: string): number {
  const a = normalize(target);
  const b = normalize(candidate);
  const words = (s: string) => s.split(" ").length;
  return (
    Math.min(commonSuffix(a, b), 4) * 1.5 +
    (words(a) === words(b) ? 2 : 0) -
    Math.min(Math.abs(a.length - b.length), 8) * 0.3
  );
}

/**
 * Up to `count` distractor ids for `target`, chosen from `pool` (which may include the target).
 * `random` adds jitter so the same word doesn't always get the same options.
 */
export function pickDistractors(
  target: ChoiceWord,
  pool: ChoiceWord[],
  answerInSpanish: boolean,
  { count = CHOICE_COUNT - 1, random = Math.random }: { count?: number; random?: () => number } = {},
): number[] {
  const targetLabel = normalize(optionLabel(target, answerInSpanish));
  const targetHint = hintOf(target);
  const taken = [signature(target.translations)];
  const labels = [bare(optionLabel(target, answerInSpanish))];

  const ranked = pool
    .filter((w) => w.id !== target.id && w.translations.length > 0)
    .map((w) => ({
      w,
      score:
        similarity(targetLabel, optionLabel(w, answerInSpanish)) +
        hintScore(targetHint, hintOf(w)) +
        random() * 3,
    }))
    .sort((x, y) => y.score - x.score);

  const picked: number[] = [];
  for (const { w } of ranked) {
    if (picked.length >= count) break;
    const label = bare(optionLabel(w, answerInSpanish));
    const sig = signature(w.translations);
    if (!label || labels.some((l) => contains(l, label)) || taken.some((s) => overlaps(s, sig))) continue;
    picked.push(w.id);
    labels.push(label);
    taken.push(sig);
  }
  return picked;
}
