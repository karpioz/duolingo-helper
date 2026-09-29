import Link from "next/link";

const links = [
  { href: "/words", label: "Words" },
  { href: "/test", label: "Test me" },
  { href: "/analytics", label: "Analytics" },
];

export function SiteHeader() {
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
      </nav>
    </header>
  );
}
