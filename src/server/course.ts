import "server-only";
import { count, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { words } from "@/db/schema";
import { DEFAULT_COURSE } from "@/lib/courses";

/** Cookie holding the course the user is studying. */
export const COURSE_COOKIE = "course";

/** Courses that have words, most words first. */
export const listCourses = cache(async () =>
  db.select({ id: words.course, words: count() }).from(words).groupBy(words.course).orderBy(desc(count())),
);

/**
 * The course everything is shown for: the cookie's choice while it has words, else the course
 * with the most words. Outside a request (dev scripts) there is no cookie.
 */
export const currentCourse = cache(async (): Promise<string> => {
  let chosen: string | undefined;
  try {
    chosen = (await cookies()).get(COURSE_COOKIE)?.value;
  } catch {
    // Not in a request.
  }
  const courses = await listCourses();
  if (chosen && courses.some((c) => c.id === chosen)) return chosen;
  return courses[0]?.id ?? DEFAULT_COURSE;
});
