export const SOURCE_LABELS: Record<string, string> = {
  recent: "Recently learned",
  alphabetical: "Alphabetical",
  random: "Random",
  tagged: "Tagged",
  missed: "Missed last time",
  due: "Due for review",
  retest: "Retest",
};

export const DIRECTION_LABELS: Record<string, string> = {
  source_to_target: "Spanish → English",
  target_to_source: "English → Spanish",
  mixed: "Mixed",
};

export function describeExam(source: string, direction: string) {
  return `${SOURCE_LABELS[source] ?? source} · ${DIRECTION_LABELS[direction] ?? direction}`;
}
