import data from "../../data/spanish-verbs.json";
import { normalize, stripAccents } from "../answers";

/**
 * Spanish verb conjugations for the /verbs lookup page. The data is Fred Jehle's conjugated verb
 * database (637 common verbs, CC BY-NC-SA 3.0), trimmed to six simple tenses by
 * dev/scripts/build-verbs.ts. It is bundled, not stored in Neon: it is reference data, not
 * something the user learns or imports.
 *
 * Server-side only in practice (the JSON is ~400 KB); the client gets just `verbIndex()`.
 */

export const TENSES = [
  { key: "presente", name: "Presente", english: "Present" },
  { key: "indefinido", name: "Pretérito indefinido", english: "Simple past" },
  { key: "imperfecto", name: "Pretérito imperfecto", english: "Imperfect past" },
  { key: "futuro", name: "Futuro simple", english: "Future" },
  { key: "condicional", name: "Condicional", english: "Conditional" },
  { key: "subjuntivo", name: "Presente de subjuntivo", english: "Present subjunctive" },
] as const;

export type TenseKey = (typeof TENSES)[number]["key"];

export const PERSONS = [
  "yo",
  "tú",
  "él / ella / usted",
  "nosotros",
  "vosotros",
  "ellos / ellas / ustedes",
] as const;

export type Verb = {
  /** Infinitive, e.g. "hablar" or "acostarse". */
  inf: string;
  /** English meaning(s), e.g. "to speak, talk". */
  en: string;
  ger: string;
  part: string;
  /** Six forms per tense (yo … ellos). Impersonal verbs (llover) leave some blank. */
  t: Record<TenseKey, string[]>;
};

const verbs = data as Verb[];

/** Lowercase without accents or diacritics, so "hable" finds "hablé" and "esta" finds "está". */
export function fold(s: string): string {
  return stripAccents(normalize(s));
}

const byInfinitive = new Map(verbs.map((v) => [fold(v.inf), v]));

export type FormMatch = { verb: Verb; tense: TenseKey; person: number; form: string };

let formIndex: Map<string, FormMatch[]> | undefined;

/** Folded conjugated form (without reflexive pronoun) → every verb/tense/person that produces it. */
function forms(): Map<string, FormMatch[]> {
  if (formIndex) return formIndex;
  formIndex = new Map();
  for (const verb of verbs) {
    for (const { key } of TENSES) {
      verb.t[key].forEach((form, person) => {
        if (!form) return;
        const k = stripPronoun(fold(form));
        const list = formIndex!.get(k) ?? [];
        if (!list.some((m) => m.verb === verb && m.tense === key && m.person === person)) {
          list.push({ verb, tense: key, person, form });
        }
        formIndex!.set(k, list);
      });
    }
  }
  return formIndex;
}

/** Light list for the client-side autocomplete: infinitive + first English meaning. */
export function verbIndex(): { inf: string; en: string }[] {
  return verbs.map((v) => ({ inf: v.inf, en: v.en.split(/[;,]/)[0].trim() }));
}

export type Lookup =
  | { kind: "verb"; verb: Verb; matches: FormMatch[] }
  | { kind: "none"; suggestions: Verb[] };

/**
 * Resolves what the user typed: an infinitive ("hablar", "Hablar", "acostarse"), a conjugated
 * form ("hablo", "fui", "me acuesto"), or neither. A conjugated form returns every match, so
 * "fui" lists both ir and ser; the first match's verb is shown.
 */
export function lookup(query: string): Lookup {
  const q = fold(query);
  const verb = byInfinitive.get(q);
  if (verb) return { kind: "verb", verb, matches: [] };

  const bare = stripPronoun(q);
  const matches = forms().get(bare) ?? [];
  if (matches.length) {
    // "me acuesto" → acostarse before acostar; then present before past etc.
    const reflexive = bare !== q;
    const order = (m: FormMatch) =>
      (m.verb.inf.endsWith("se") === reflexive ? 0 : 10) + TENSES.findIndex((t) => t.key === m.tense);
    const sorted = [...matches].sort((a, b) => order(a) - order(b));
    return { kind: "verb", verb: sorted[0].verb, matches: sorted };
  }
  return { kind: "none", suggestions: searchInfinitives(q, 8) };
}

/** Infinitives starting with, then containing, the folded query. */
function searchInfinitives(q: string, limit: number): Verb[] {
  if (!q) return [];
  const starts: Verb[] = [];
  const contains: Verb[] = [];
  for (const [k, v] of byInfinitive) {
    if (k.startsWith(q)) starts.push(v);
    else if (k.includes(q) || fold(v.en).includes(q)) contains.push(v);
  }
  return [...starts, ...contains].slice(0, limit);
}

function stripPronoun(form: string): string {
  return form.replace(/^(me|te|se|nos|os)\s+/i, "");
}

const ENDINGS: Record<"ar" | "er" | "ir", Partial<Record<TenseKey, string[]>>> = {
  ar: {
    presente: ["o", "as", "a", "amos", "áis", "an"],
    indefinido: ["é", "aste", "ó", "amos", "asteis", "aron"],
    imperfecto: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
    subjuntivo: ["e", "es", "e", "emos", "éis", "en"],
  },
  er: {
    presente: ["o", "es", "e", "emos", "éis", "en"],
    indefinido: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    imperfecto: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    subjuntivo: ["a", "as", "a", "amos", "áis", "an"],
  },
  ir: {
    presente: ["o", "es", "e", "imos", "ís", "en"],
    indefinido: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    imperfecto: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    subjuntivo: ["a", "as", "a", "amos", "áis", "an"],
  },
};
const FUTURE = ["é", "ás", "á", "emos", "éis", "án"];
const CONDITIONAL = ["ía", "ías", "ía", "íamos", "íais", "ían"];

/**
 * What the form would be if the verb followed its -ar/-er/-ir model with no changes. Used only
 * to mark irregular letters in the real (database) forms, never shown on its own.
 */
export function regularForm(inf: string, tense: TenseKey, person: number): string {
  const base = inf.replace(/se$/, "").replace(/í(r)$/, "i$1"); // acostarse → acostar, reír → reir
  if (tense === "futuro") return base + FUTURE[person];
  if (tense === "condicional") return base + CONDITIONAL[person];
  const model = base.slice(-2) as "ar" | "er" | "ir";
  return base.slice(0, -2) + ENDINGS[model][tense]![person];
}

export type Segment = { text: string; irregular: boolean };

/**
 * Splits `form` into the parts it shares with the regular form (start and end) and the part in
 * between that differs: tengo vs teno → ten·g·o, puedo vs podo → p·ue·do, fui vs sí → fui.
 * Reflexive pronouns ("me acuesto") are kept and never marked.
 */
export function markIrregular(inf: string, tense: TenseKey, person: number, form: string): Segment[] {
  if (!form) return [];
  const pronoun = form.slice(0, form.length - stripPronoun(form).length);
  const actual = form.slice(pronoun.length);
  const regular = regularForm(inf, tense, person);
  if (actual === regular) return [{ text: form, irregular: false }];

  let start = 0;
  while (start < actual.length && start < regular.length && actual[start] === regular[start]) start++;
  let end = 0;
  while (
    end < actual.length - start &&
    end < regular.length - start &&
    actual[actual.length - 1 - end] === regular[regular.length - 1 - end]
  ) {
    end++;
  }
  // Pure deletion (the form is the regular one with letters removed): mark the letter after the gap.
  if (start + end === actual.length) end = Math.max(0, end - 1);

  return [
    { text: pronoun + actual.slice(0, start), irregular: false },
    { text: actual.slice(start, actual.length - end), irregular: true },
    { text: actual.slice(actual.length - end), irregular: false },
  ].filter((s) => s.text);
}

/** True if any form of the verb (in the tenses shown) differs from the regular model. */
export function isIrregular(verb: Verb): boolean {
  return TENSES.some(({ key }) =>
    verb.t[key].some((form, p) => form && stripPronoun(form) !== regularForm(verb.inf, key, p)),
  );
}
