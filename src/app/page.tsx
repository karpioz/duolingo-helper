import { count } from "drizzle-orm";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { tags, translations, words } from "@/db/schema";

export default async function Home() {
  await connection();

  const [[wordCount], [translationCount], tagRows] = await Promise.all([
    db.select({ n: count() }).from(words),
    db.select({ n: count() }).from(translations),
    db.select({ name: tags.name, color: tags.color }).from(tags).orderBy(tags.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Duolingo Helper</h1>
        <p className="text-muted-foreground">Spanish vocabulary practice built from your Duolingo words.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your library</CardTitle>
          <CardDescription>
            Connected to Neon branch <code className="font-mono">{process.env.NEON_BRANCH ?? "unknown"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Words" value={wordCount.n} />
            <Stat label="Translations" value={translationCount.n} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Tags:</span>
            {tagRows.map((t) => (
              <Badge key={t.name} variant="outline" style={t.color ? { borderColor: t.color, color: t.color } : undefined}>
                {t.name}
              </Badge>
            ))}
          </div>
          {wordCount.n === 0 && (
            <p className="text-sm text-muted-foreground">No words yet — run the Duolingo import to load your vocabulary.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
