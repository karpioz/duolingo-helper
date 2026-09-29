import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/words", label: "Words" },
  { href: "/test", label: "Test me" },
  { href: "/analytics", label: "Analytics" },
];

export function SiteHeader({ email }: { email: string }) {
  return (
    <header className="border-b">
      <nav className="mx-auto flex h-14 w-full max-w-3xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Duolingo Helper
        </Link>
        <div className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
        <form action={signOut} className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </nav>
    </header>
  );
}
