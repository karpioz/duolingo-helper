import { describe, expect, it } from "vitest";
import { isIrregular, lookup, markIrregular, regularForm, type Verb } from ".";

const verb = (q: string): Verb => {
  const r = lookup(q);
  if (r.kind !== "verb") throw new Error(`no verb for ${q}`);
  return r.verb;
};
const marked = (inf: string, tense: Parameters<typeof regularForm>[1], p: number) => {
  const v = verb(inf);
  return markIrregular(v.inf, tense, p, v.t[tense][p])
    .map((s) => (s.irregular ? `[${s.text}]` : s.text))
    .join("");
};

describe("data", () => {
  it("has the common irregulars with accents", () => {
    expect(verb("ser").t.presente).toEqual(["soy", "eres", "es", "somos", "sois", "son"]);
    expect(verb("ir").t.indefinido).toEqual(["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"]);
    expect(verb("tener").t.futuro[0]).toBe("tendré");
    expect(verb("hacer").t.indefinido[2]).toBe("hizo");
    expect(verb("estar").t.presente).toEqual(["estoy", "estás", "está", "estamos", "estáis", "están"]);
    expect(verb("dormir").t.indefinido[2]).toBe("durmió");
    expect(verb("hablar").ger).toBe("hablando");
  });

  it("matches the regular model for regular verbs", () => {
    for (const inf of ["hablar", "comer", "vivir"]) expect(isIrregular(verb(inf))).toBe(false);
    for (const inf of ["ser", "tener", "poder", "pedir"]) expect(isIrregular(verb(inf))).toBe(true);
  });
});

describe("lookup", () => {
  it("is case- and accent-tolerant for infinitives", () => {
    expect(verb("  HABLAR ").inf).toBe("hablar");
    expect(verb("reir").inf).toBe("reír");
  });

  it("resolves conjugated forms to their infinitive", () => {
    expect(verb("hablo").inf).toBe("hablar");
    expect(verb("hable").inf).toBe("hablar"); // hablé or hable (subjunctive)
    expect(verb("me acuesto").inf).toBe("acostarse");
    const fui = lookup("fui");
    expect(fui.kind === "verb" && fui.matches.map((m) => m.verb.inf)).toEqual(["ir", "ser", "irse"]);
  });

  it("suggests infinitives when nothing matches", () => {
    const r = lookup("habl");
    expect(r.kind === "none" && r.suggestions.map((v) => v.inf)).toContain("hablar");
  });
});

describe("markIrregular", () => {
  it("marks stem changes and irregular stems", () => {
    expect(marked("poder", "presente", 0)).toBe("p[ue]do");
    expect(marked("tener", "presente", 0)).toBe("ten[g]o");
    expect(marked("tener", "futuro", 0)).toBe("ten[d]ré");
    expect(marked("dormir", "indefinido", 2)).toBe("d[u]rmió");
    expect(marked("ser", "presente", 0)).toBe("so[y]");
    expect(marked("ir", "indefinido", 0)).toBe("[fui]");
  });

  it("leaves regular forms alone", () => {
    expect(marked("hablar", "indefinido", 0)).toBe("hablé");
    expect(marked("poder", "presente", 3)).toBe("podemos");
  });
});
