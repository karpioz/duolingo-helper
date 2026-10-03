import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** "Back to …" pill: a teal arrow circle plus the destination's name. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-9 items-center gap-2 self-start rounded-full border border-input bg-card pr-3.5 pl-1 text-sm font-semibold text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-teal text-white transition-transform group-hover:-translate-x-0.5">
        <ArrowLeft className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
      {children}
    </Link>
  );
}
