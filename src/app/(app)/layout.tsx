import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { currentCourse, listCourses } from "@/server/course";
import { requireUser } from "@/server/session";

/** Every app page requires a signed-in, allowlisted user. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Per-request (session cookies); tells Next up front so it doesn't try to prerender.
  await connection();
  const user = await requireUser();
  const [course, courses] = await Promise.all([currentCourse(), listCourses()]);
  return (
    <>
      <SiteHeader email={user.email} course={course} courses={courses} />
      {children}
    </>
  );
}
