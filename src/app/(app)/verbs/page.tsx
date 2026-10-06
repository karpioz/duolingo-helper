import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { courseInfo } from "@/lib/courses";
import { cn } from "@/lib/utils";
import {
  type FormMatch,
  isIrregular,
  lookup,
  markIrregular,
  PERSONS,
  TENSES,
  type Verb,
  verbIndex,
} from "@/lib/verbs";
import { currentCourse } from "@/server/course";
import { VerbSearch } from "./verb-search";

export const metadata: Metadata = { title: "Verbs · Duolingo Helper" };

const QUICK = ["ser", "estar", "ir", "hacer", "tener", "hablar", "poder", "querer"];
const CORE = TENSES.slice(0, 4);
const MORE = TENSES.slice(4);

const verbHref = (inf: string) => `/verbs?v=${encodeURIComponent(inf)}`;

export default async function VerbsPage({ searchParams }: PageProps<"/verbs">) {
  const [sp, course] = await Promise.all([searchParams, currentCourse()]);
  const info = courseInfo(course);
  // The nav hides Verbs for other courses; this covers switching course while on the page.
  if (info.learning.code !== "es") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-8">
        <h1 className="text-4xl font-extrabold">Verbs</h1>
        <p className="py-10 text-center text-muted-foreground">
          Verb conjugations are available for Spanish only. Switch to your Spanish course to use them.
        </p>
      </main>
    );
  }
  const q = (Array.isArray(sp.v) ? sp.v[0] : sp.v)?.trim() ?? "";
  const result = q ? lookup(q) : undefined;
  const verb = result?.kind === "verb" ? result.verb : undefined;
  const index = verbIndex();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold">Verbs</h1>
        <span className="pb-1 text-sm text-muted-foreground tabular-nums">
          {index.length} Spanish verbs
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <VerbSearch key={q} verbs={index} initial={q} />
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((inf) => (
            <Button
              key={inf}
              size="sm"
              variant={verb?.inf === inf ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={verbHref(inf)} />}
              className="px-3"
            >
              {inf}
            </Button>
          ))}
        </div>
      </div>

      {!result && (
        <p className="py-10 text-center text-muted-foreground">
          Look up any of the {index.length} most common verbs, or type a form you saw (<i>fui</i>, <i>tengo</i>,{" "}
          <i>hicimos</i>) to find its infinitive.
        </p>
      )}

      {result?.kind === "none" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">
            No verb or conjugated form matches <b className="text-foreground">{q}</b>.
          </p>
          {result.suggestions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              <span className="text-sm text-muted-foreground">Did you mean</span>
              {result.suggestions.map((v) => (
                <Link key={v.inf} href={verbHref(v.inf)} className="text-sm font-semibold text-primary hover:underline">
                  {v.inf}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {verb && result?.kind === "verb" && <VerbDetails verb={verb} matches={result.matches} />}

      <p className="mt-auto pt-6 text-xs text-muted-foreground">
        Conjugations from{" "}
        <a
          href="https://github.com/ghidinelli/fred-jehle-spanish-verbs"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Fred Jehle&apos;s Spanish verb database
        </a>{" "}
        (CC BY-NC-SA 3.0).
      </p>
    </main>
  );
}

function VerbDetails({ verb, matches }: { verb: Verb; matches: FormMatch[] }) {
  const hit = matches.find((m) => m.verb === verb);
  // Other verbs the typed form belongs to ("fui" → also ser), once each.
  const others = [...new Map(matches.filter((m) => m.verb !== verb).map((m) => [m.verb.inf, m])).values()];
  const tenseName = (key: string) => TENSES.find((t) => t.key === key)!.name;
  const irregular = isIrregular(verb);

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-heading text-3xl font-extrabold break-all">{verb.inf}</h2>
            <Badge variant={irregular ? "default" : "secondary"}>{irregular ? "Irregular" : "Regular"}</Badge>
            {verb.inf.endsWith("se") && <Badge variant="outline">Reflexive</Badge>}
          </div>
          <p className="text-base">{verb.en}</p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Gerund</dt>
              <dd className="font-semibold">{verb.ger}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Participle</dt>
              <dd className="font-semibold">{verb.part}</dd>
            </div>
          </dl>
          {hit && (
            <p className="mt-1 rounded-xl bg-saffron-soft/50 px-3 py-2 text-sm dark:bg-saffron/15">
              <b>{hit.form}</b> is <b>{verb.inf}</b> · {tenseName(hit.tense)} · {PERSONS[hit.person]}
              {others.length > 0 && (
                <>
                  . Also:{" "}
                  {others.map((m, i) => (
                    <Fragment key={m.verb.inf}>
                      {i > 0 && ", "}
                      <Link href={verbHref(m.verb.inf)} className="font-semibold text-primary hover:underline">
                        {m.verb.inf}
                      </Link>{" "}
                      ({tenseName(m.tense).toLowerCase()}, {PERSONS[m.person]})
                    </Fragment>
                  ))}
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs
        key={verb.inf + (hit?.tense ?? "")}
        defaultValue={hit && MORE.some((t) => t.key === hit.tense) ? "more" : "core"}
        className="gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <TabsList>
            <TabsTrigger value="core" className="px-3">
              Core tenses
            </TabsTrigger>
            <TabsTrigger value="more" className="px-3">
              Conditional &amp; subjunctive
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-muted-foreground">
            <b className="text-terracotta dark:text-orange-300">Bold</b> = differs from the regular -
            {verb.inf.replace(/se$/, "").slice(-2).replace("í", "i")} pattern
          </p>
        </div>
        {[
          { value: "core", tenses: CORE },
          { value: "more", tenses: MORE },
        ].map(({ value, tenses }) => (
          <TabsContent key={value} value={value} className="grid gap-4 sm:grid-cols-2">
            {tenses.map((t) => (
              <TenseCard key={t.key} verb={verb} tense={t} hit={hit?.tense === t.key ? hit.person : undefined} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function TenseCard({
  verb,
  tense,
  hit,
}: {
  verb: Verb;
  tense: (typeof TENSES)[number];
  /** Person of the form the user searched for, highlighted. */
  hit?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold">{tense.name}</CardTitle>
        <CardDescription>{tense.english}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1">
          {PERSONS.map((person, p) => {
            const form = verb.t[tense.key][p];
            return (
              <Fragment key={person}>
                <dt className="text-xs text-muted-foreground">{person}</dt>
                <dd
                  className={cn(
                    "-mx-1.5 rounded-md px-1.5 py-0.5 text-base break-words",
                    p === hit && "bg-saffron-soft/60 ring-1 ring-saffron dark:bg-saffron/20",
                  )}
                >
                  {form ? (
                    markIrregular(verb.inf, tense.key, p, form).map((s, i) =>
                      s.irregular ? (
                        <b key={i} className="font-extrabold text-terracotta dark:text-orange-300">
                          {s.text}
                        </b>
                      ) : (
                        <span key={i}>{s.text}</span>
                      ),
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </Fragment>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
