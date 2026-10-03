"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/words", label: "Words" },
  { href: "/test", label: "Test me" },
  { href: "/test/personal", label: "My tests" },
  { href: "/analytics", label: "Analytics" },
];

/** Header links; the current section is highlighted (the longest matching prefix wins). */
export function NavLinks() {
  const pathname = usePathname();
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    // Scrolls sideways on narrow phones rather than wrapping.
    <div className="flex min-w-0 gap-3 overflow-x-auto text-sm whitespace-nowrap sm:gap-5 sm:text-[15px]">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.href === active ? "page" : undefined}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            l.href === active && "font-bold text-primary hover:text-primary",
          )}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
