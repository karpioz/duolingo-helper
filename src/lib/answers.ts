/**
 * Answer checking for typed tests. Pure functions, shared by server and client.
 *
 * Accepted answers come from Duolingo translations such as "(you) learned" or "(?) did you learn".
 * Brackets are optional hints, so "(you) learned" accepts "you learned" and "learned".
 */

export type MatchKind = "exact" | "almost" | "wrong";

export type CheckResult = {
  kind: MatchKind;
  /** The accepted answer that matched (as originally written), if any. */
  matched?: string;
};

const LEADING_WORDS = /^(to|the|a|an|el|la|los|las|un|una|unos|unas)\s+/;

/** Lowercase, trim, drop punctuation (keeping letters incl. accents), collapse spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[’`´]/g, "'")
    .replace(/[.,!?¿¡;:"“”«»()[\]{}…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove diacritics: "aprendí" → "aprendi", "niño" → "nino". */
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize("NFC");
}

/** All normalized forms an accepted answer allows. */
export function variants(accepted: string): string[] {
  const out = new Set<string>();
  const withHints = normalize(accepted.replace(/\(\?\)/g, "")); // "(?)" marks a question: not a word
  const withoutHints = normalize(accepted.replace(/\([^)]*\)/g, " "));
  for (const v of [withHints, withoutHints]) {
    if (!v) continue;
    out.add(v);
    const bare = v.replace(LEADING_WORDS, "");
    if (bare) out.add(bare);
  }
  return [...out];
}

/** Levenshtein distance, stopping early once it exceeds `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Typos tolerated in lenient mode: none for short words, 1 from 4 letters, 2 from 9. */
function allowedTypos(length: number): number {
  if (length >= 9) return 2;
  if (length >= 4) return 1;
  return 0;
}

/**
 * Check `given` against the accepted answers.
 * Strict: must match a variant exactly (case, punctuation and brackets ignored).
 * Lenient: missing accents and small typos count as "almost" (still correct).
 */
export function checkAnswer(given: string, accepted: string[], { lenient = true } = {}): CheckResult {
  const answer = normalize(given);
  if (!answer) return { kind: "wrong" };
  const bareAnswer = answer.replace(LEADING_WORDS, "");

  const candidates = accepted.flatMap((a) => variants(a).map((v) => ({ v, original: a })));

  for (const { v, original } of candidates) {
    if (v === answer || v === bareAnswer) return { kind: "exact", matched: original };
  }
  if (!lenient) return { kind: "wrong" };

  const plain = stripAccents(answer);
  const plainBare = stripAccents(bareAnswer);
  let best: { distance: number; original: string } | undefined;
  for (const { v, original } of candidates) {
    const target = stripAccents(v);
    if (target === plain || target === plainBare) return { kind: "almost", matched: original };
    const max = allowedTypos(target.length);
    const d = Math.min(editDistance(plain, target, max), editDistance(plainBare, target, max));
    if (d <= max && (!best || d < best.distance)) best = { distance: d, original };
  }
  return best ? { kind: "almost", matched: best.original } : { kind: "wrong" };
}

/** Readable form of an accepted answer for display ("(?) did you learn" → "did you learn?"). */
export function displayAnswer(accepted: string): string {
  return accepted.includes("(?)") ? `${accepted.replace(/\(\?\)\s*/g, "").trim()}?` : accepted;
}
