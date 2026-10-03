/**
 * Courses and languages. A course id is "<learning>-<from>" as Duolingo names it ("es-en",
 * "tr-en"). Pure data, safe on the client.
 */

export const DEFAULT_COURSE = "es-en";

export type Language = {
  code: string;
  name: string;
  /** Letters the on-screen keyboard offers when typing in this language. */
  specialChars: string[];
  /** Home page greeting. */
  greeting: string;
};

const LANGUAGES: Record<string, Omit<Language, "code">> = {
  en: { name: "English", specialChars: [], greeting: "Hello!" },
  es: { name: "Spanish", specialChars: ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"], greeting: "¡Hola!" },
  tr: { name: "Turkish", specialChars: ["ç", "ğ", "ı", "İ", "ö", "ş", "ü"], greeting: "Merhaba!" },
  fr: { name: "French", specialChars: ["à", "â", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "ù", "û", "œ"], greeting: "Bonjour !" },
  de: { name: "German", specialChars: ["ä", "ö", "ü", "ß"], greeting: "Hallo!" },
  it: { name: "Italian", specialChars: ["à", "è", "é", "ì", "ò", "ù"], greeting: "Ciao!" },
  pt: { name: "Portuguese", specialChars: ["á", "â", "ã", "à", "ç", "é", "ê", "í", "ó", "ô", "õ", "ú"], greeting: "Olá!" },
  pl: { name: "Polish", specialChars: ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"], greeting: "Cześć!" },
};

export function language(code: string): Language {
  const base = code.split("-")[0].toLowerCase();
  const known = LANGUAGES[base];
  return {
    code: base,
    name: known?.name ?? code.toUpperCase(),
    specialChars: known?.specialChars ?? [],
    greeting: known?.greeting ?? "Hello!",
  };
}

export type Course = { id: string; learning: Language; from: Language };

const COURSE_ID = /^([a-z]{2,3}(?:-[a-zA-Z]{2,4})?)-([a-z]{2,3}(?:-[a-zA-Z]{2,4})?)$/;

export function isCourseId(id: string): boolean {
  return COURSE_ID.test(id);
}

export function courseInfo(id: string): Course {
  const m = COURSE_ID.exec(id) ?? COURSE_ID.exec(DEFAULT_COURSE)!;
  return { id, learning: language(m[1]), from: language(m[2]) };
}

/** "Spanish → English" etc. for a course's exam directions. */
export function directionLabels(course: Course) {
  const l = course.learning.name;
  const f = course.from.name;
  return {
    source_to_target: `${l} → ${f}`,
    target_to_source: `${f} → ${l}`,
    mixed: "Mixed",
    /** Match pairs columns. */
    columns: { source_to_target: `${l} | ${f}`, target_to_source: `${f} | ${l}`, mixed: "Mixed" },
  };
}

export type ExamDirection = "source_to_target" | "target_to_source" | "mixed";

/** Direction choices for forms, labelled with the course's languages. */
export function directionOptions(courseId: string): { value: ExamDirection; label: string; matchLabel: string }[] {
  const labels = directionLabels(courseInfo(courseId));
  return (["source_to_target", "target_to_source", "mixed"] as const).map((value) => ({
    value,
    label: labels[value],
    matchLabel: labels.columns[value],
  }));
}
