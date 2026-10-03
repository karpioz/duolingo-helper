import { courseInfo, DEFAULT_COURSE, directionLabels } from "./courses";

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

/** "Spanish → English", "English → Turkish", "Mixed". */
export function directionLabel(direction: string, course: string = DEFAULT_COURSE): string {
  const labels = directionLabels(courseInfo(course));
  return labels[direction as keyof typeof labels] as string ?? direction;
}

type ExamLike = { source: string; direction: string; mode?: string; course?: string; testName?: string | null };

/** "Match pairs · Due for review": the exam's type and word source, without the direction. */
export function describeExamSource({ source, mode, testName }: Omit<ExamLike, "direction">) {
  const from = source === "personal" && testName ? testName : (SOURCE_LABELS[source] ?? source);
  if (mode === "match") return `Match pairs · ${from}`;
  if (mode === "choice") return `Multiple choice · ${from}`;
  return from;
}

/** "Match pairs · Due for review · Spanish → English"; personal tests show their name in place of "Personal". */
export function describeExam(exam: ExamLike) {
  return `${describeExamSource(exam)} · ${directionLabel(exam.direction, exam.course)}`;
}

/** Name suggested when saving a generated exam as a personal test: "Due for review · Spanish → English · 3 Oct". */
export function defaultTestName(session: ExamLike & { startedAt: Date }) {
  const date = session.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${describeExam({ ...session, testName: null })} · ${date}`;
}
