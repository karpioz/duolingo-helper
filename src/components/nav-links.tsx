"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { courseInfo } from "@/lib/courses";
import { cn } from "@/lib/utils";

const links: { href: string; label: string; languages?: string[] }[] = [
  { href: "/words", label: "Words" },
  // Conjugation data exists only for Spanish (see /verbs).
  { href: "/verbs", label: "Verbs", languages: ["es"] },
  { href: "/test", label: "Test me" },
  { href: "/test/personal", label: "My tests" },
  { href: "/analytics", label: "Analytics" },
];

/** Header links; the current section is highlighted (the longest matching prefix wins). */
export function NavLinks({ course }: { course: string }) {
  const pathname = usePathname();
  const learning = courseInfo(course).learning.code;
  const shown = links.filter((l) => !l.languages || l.languages.includes(learning));
  const active = shown
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    // Scrolls sideways on narrow phones rather than wrapping.
    <div className="flex min-w-0 gap-3 overflow-x-auto text-sm whitespace-nowrap sm:gap-5 sm:text-[15px]">
      {shown.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.href === active ? "page" : undefined}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            l.href === active && "font-bold text-terracotta hover:text-terracotta",
          )}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
