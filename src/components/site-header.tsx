import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { CourseSwitcher } from "@/components/course-switcher";
import { NavLinks } from "@/components/nav-links";
import { TileStrip } from "@/components/tile-strip";
import { Button } from "@/components/ui/button";


export function SiteHeader({
  email,
  course,
  courses,
}: {
  email: string;
  course: string;
  courses: { id: string; words: number }[];
}) {
  return (
    <header>
      <TileStrip />
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:gap-7">
        <Link
          href="/"
          className="shrink-0 font-heading text-lg font-extrabold tracking-tight sm:text-xl"
          aria-label="Duolingo Helper"
        >
          <span className="sm:hidden">
            D<span className="text-terracotta">H</span>
          </span>
          <span className="hidden sm:inline">
            Duolingo <span className="text-terracotta">Helper</span>
          </span>
        </Link>
        <NavLinks course={course} />
        <div className="ml-auto shrink-0">
          <CourseSwitcher current={course} courses={courses} />
        </div>
        <form action={signOut} className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:inline">{email}</span>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </nav>
    </header>
  );
}
