export const SOURCE_LABELS: Record<string, string> = {
  recent: "Recently learned",
  alphabetical: "Alphabetical",
  random: "Random",
  tagged: "Tagged",
  missed: "Missed last time",
  due: "Due for review",
  retest: "Retest",
  personal: "Personal",
};

export const DIRECTION_LABELS: Record<string, string> = {
  source_to_target: "Spanish → English",
  target_to_source: "English → Spanish",
  mixed: "Mixed",
};

/** `testName`: personal tests show their name in place of "Personal". */
export function describeExam(source: string, direction: string, mode?: string, testName?: string | null) {
  const from = source === "personal" && testName ? testName : (SOURCE_LABELS[source] ?? source);
  const base = `${from} · ${DIRECTION_LABELS[direction] ?? direction}`;
  if (mode === "match") return `Match pairs · ${base}`;
  if (mode === "choice") return `Multiple choice · ${base}`;
  return base;
}

/** Name suggested when saving a generated exam as a personal test: "Due for review · Spanish → English · 3 Oct". */
export function defaultTestName(session: { source: string; direction: string; mode: string; startedAt: Date }) {
  const date = session.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${describeExam(session.source, session.direction, session.mode)} · ${date}`;
}
