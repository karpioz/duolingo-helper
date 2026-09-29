import { describe, expect, it } from "vitest";
import { checkAnswer, displayAnswer, editDistance, normalize, stripAccents, variants } from "./answers";

const aprendiste = ["(?) did you learn", "learn", "(you) learned", "learned"];

describe("normalize", () => {
  it("lowercases, strips punctuation and collapses spaces", () => {
    expect(normalize("  ¿Cómo  estás? ")).toBe("cómo estás");
  });
});

describe("stripAccents", () => {
  it("removes diacritics including ñ", () => {
    expect(stripAccents("aprendí niño pingüino")).toBe("aprendi nino pinguino");
  });
});

describe("variants", () => {
  it("treats brackets as optional hints", () => {
    expect(variants("(you) learned")).toEqual(expect.arrayContaining(["you learned", "learned"]));
  });
  it("drops the (?) question marker", () => {
    expect(variants("(?) did you learn")).toContain("did you learn");
  });
  it("allows dropping a leading article or 'to'", () => {
    expect(variants("to learn")).toContain("learn");
    expect(variants("the woman")).toContain("woman");
  });
});

describe("editDistance", () => {
  it("computes Levenshtein distance", () => {
    expect(editDistance("learned", "learnd")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});

describe("checkAnswer", () => {
  it("accepts any listed translation, with or without hints", () => {
    for (const given of ["did you learn", "Did you learn?", "learn", "you learned", "(you) learned", "learned"]) {
      expect(checkAnswer(given, aprendiste).kind).toBe("exact");
    }
  });

  it("rejects wrong and empty answers", () => {
    expect(checkAnswer("taught", aprendiste).kind).toBe("wrong");
    expect(checkAnswer("   ", aprendiste).kind).toBe("wrong");
  });

  it("accepts an extra leading article or 'to'", () => {
    expect(checkAnswer("to learn", aprendiste).kind).toBe("exact");
    expect(checkAnswer("la mujer", ["mujer"]).kind).toBe("exact");
  });

  it("treats missing accents as almost in lenient mode, wrong in strict", () => {
    expect(checkAnswer("aprendi", ["aprendí"])).toEqual({ kind: "almost", matched: "aprendí" });
    expect(checkAnswer("aprendi", ["aprendí"], { lenient: false }).kind).toBe("wrong");
    expect(checkAnswer("nino", ["niño"]).kind).toBe("almost");
  });

  it("tolerates small typos only on longer words", () => {
    expect(checkAnswer("learnd", aprendiste).kind).toBe("almost");
    expect(checkAnswer("sí", ["si"]).kind).toBe("almost"); // accent only
    expect(checkAnswer("so", ["si"]).kind).toBe("wrong"); // too short for typos
    expect(checkAnswer("lerned", ["learned"]).kind).toBe("almost");
    expect(checkAnswer("larned", ["learn"]).kind).toBe("wrong");
  });
});

describe("displayAnswer", () => {
  it("turns the (?) marker into a question mark", () => {
    expect(displayAnswer("(?) did you learn")).toBe("did you learn?");
    expect(displayAnswer("(you) learned")).toBe("(you) learned");
  });
});
