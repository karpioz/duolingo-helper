import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/words", label: "Words" },
  { href: "/test", label: "Test me" },
  { href: "/test/personal", label: "My tests" },
  { href: "/analytics", label: "Analytics" },
];

export function SiteHeader({ email }: { email: string }) {
  return (
    <header className="border-b">
      <nav className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:gap-6">
        <Link href="/" className="shrink-0 font-semibold tracking-tight" aria-label="Duolingo Helper">
          <span className="sm:hidden">DH</span>
          <span className="hidden sm:inline">Duolingo Helper</span>
        </Link>
        {/* Scrolls sideways on narrow phones rather than wrapping. */}
        <div className="flex min-w-0 gap-3 overflow-x-auto text-sm whitespace-nowrap sm:gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
        <form action={signOut} className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </nav>
    </header>
  );
}
