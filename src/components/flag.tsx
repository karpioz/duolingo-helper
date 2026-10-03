import { cn } from "@/lib/utils";

/**
 * A small flag for a language code (Spain for "es", UK for "en", Turkey for "tr"); unknown
 * languages get their code in a box. Decorative: pair it with the language name in text.
 */
export function Flag({ code, className }: { code: string; className?: string }) {
  const box = cn("inline-flex h-[1em] w-[1.5em] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/15", className);
  switch (code) {
    case "es":
      return (
        <span className={box} aria-hidden>
          <svg viewBox="0 0 3 2" className="size-full" preserveAspectRatio="none">
            <rect width="3" height="2" fill="#AA151B" />
            <rect y="0.5" width="3" height="1" fill="#F1BF00" />
          </svg>
        </span>
      );
    case "en":
      return (
        <span className={box} aria-hidden>
          <svg viewBox="0 0 60 30" className="size-full" preserveAspectRatio="xMidYMid slice">
            <rect width="60" height="30" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
            <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" strokeWidth="10" />
            <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
          </svg>
        </span>
      );
    case "tr":
      return (
        <span className={box} aria-hidden>
          <svg viewBox="0 0 1200 800" className="size-full" preserveAspectRatio="xMidYMid slice">
            <rect width="1200" height="800" fill="#E30A17" />
            <circle cx="425" cy="400" r="200" fill="#FFFFFF" />
            <circle cx="475" cy="400" r="160" fill="#E30A17" />
            <polygon
              fill="#FFFFFF"
              points="483.3,400 552.4,422.5 552.4,495.1 595.1,436.3 664.2,458.8 621.5,400 664.2,341.2 595.1,363.7 552.4,304.9 552.4,377.5"
            />
          </svg>
        </span>
      );
    default:
      return (
        <span
          className={cn(box, "items-center justify-center bg-muted text-[0.5em] font-semibold uppercase")}
          aria-hidden
        >
          {code}
        </span>
      );
  }
}
