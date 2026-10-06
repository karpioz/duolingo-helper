/**
 * Builds src/data/spanish-verbs.json from Fred Jehle's conjugated Spanish verb database
 * (637 verbs, CC BY-NC-SA 3.0, https://github.com/ghidinelli/fred-jehle-spanish-verbs).
 * Keeps only the simple tenses the /verbs page shows.
 *
 *   npx tsx dev/scripts/build-verbs.ts            # downloads the CSV from GitHub
 *   npx tsx dev/scripts/build-verbs.ts path.csv   # or reads a local copy
 */
import { readFile, writeFile } from "node:fs/promises";

const SOURCE =
  "https://raw.githubusercontent.com/ghidinelli/fred-jehle-spanish-verbs/master/jehle_verb_database.csv";

/** (mood, tense) in the CSV → key in the JSON. Order matches TENSES in src/lib/verbs. */
const TENSES: Record<string, string> = {
  "Indicativo|Presente": "presente",
  "Indicativo|Pretérito": "indefinido",
  "Indicativo|Imperfecto": "imperfecto",
  "Indicativo|Futuro": "futuro",
  "Indicativo|Condicional": "condicional",
  "Subjuntivo|Presente": "subjuntivo",
};
const FORMS = ["form_1s", "form_2s", "form_3s", "form_1p", "form_2p", "form_3p"];

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === "\n") {
      row.push(field);
      field = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

async function main() {
  const path = process.argv[2];
  const text = path ? await readFile(path, "utf8") : await (await fetch(SOURCE)).text();
  const [header, ...rows] = parseCsv(text.normalize("NFC"));
  const col = (name: string) => header.indexOf(name);

  type Verb = { inf: string; en: string; ger: string; part: string; t: Record<string, string[]> };
  const verbs = new Map<string, Verb>();
  for (const r of rows) {
    const key = TENSES[`${r[col("mood")]}|${r[col("tense")]}`];
    if (!key) continue;
    const inf = r[col("infinitive")].trim();
    let v = verbs.get(inf);
    if (!v) {
      v = {
        inf,
        en: r[col("infinitive_english")].trim(),
        ger: r[col("gerund")].trim(),
        part: r[col("pastparticiple")].trim(),
        t: {},
      };
      verbs.set(inf, v);
    }
    v.t[key] = FORMS.map((f) => r[col(f)].trim());
  }

  const out = [...verbs.values()].sort((a, b) => a.inf.localeCompare(b.inf, "es"));
  for (const v of out) {
    for (const key of Object.values(TENSES)) {
      // Blank forms are fine: impersonal verbs (llover, nevar, doler…) have only 3rd persons.
      if (v.t[key]?.length !== 6 || v.t[key].every((f) => !f)) throw new Error(`${v.inf}: missing ${key}`);
    }
  }
  await writeFile("src/data/spanish-verbs.json", JSON.stringify(out) + "\n");
  console.log(`Wrote ${out.length} verbs to src/data/spanish-verbs.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
