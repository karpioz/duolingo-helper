import { describe, expect, it } from "vitest";
import { hintOf, optionLabel, pickDistractors, similarity } from "./choice";

const w = (id: number, text: string, ...translations: string[]) => ({ id, text, translations });
const noJitter = { random: () => 0 };

describe("optionLabel", () => {
  it("shows Spanish text or the English label", () => {
    const word = w(1, "aprendiste", "(?) did you learn", "(you) learned");
    expect(optionLabel(word, true)).toBe("aprendiste");
    expect(optionLabel(word, false)).toBe("(you) learned");
  });
});

describe("similarity", () => {
  it("prefers a shared ending and the same word count", () => {
    expect(similarity("aprendiste", "comiste")).toBeGreaterThan(similarity("aprendiste", "la casa"));
  });
});

describe("hintOf", () => {
  it("reads the person hint of the English label", () => {
    expect(hintOf(["(?) did you learn", "(you) learned"])).toBe("you");
    expect(hintOf(["(I) was", "was"])).toBe("i");
    expect(hintOf(["nine"])).toBeNull();
  });
});

describe("pickDistractors", () => {
  const target = w(1, "aprendiste", "(you) learned", "learned");

  it("never picks a word that shares a translation with the answer", () => {
    const pool = [target, w(2, "aprendí", "(I) learned", "learned"), w(3, "comiste", "(you) ate"), w(4, "bebiste", "(you) drank"), w(5, "casa", "house")];
    const ids = pickDistractors(target, pool, true, noJitter);
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
  });

  it("never picks two distractors that mean the same thing", () => {
    const pool = [target, w(2, "comiste", "(you) ate"), w(3, "comió", "(he) ate", "ate"), w(4, "comí", "ate"), w(5, "casa", "house")];
    const ids = pickDistractors(target, pool, true, noJitter);
    const eaters = ids.filter((id) => [2, 3, 4].includes(id));
    // All three mean "ate" once hints are dropped: at most one of them.
    expect(eaters.length).toBeLessThanOrEqual(1);
    expect(ids).toContain(5);
  });

  it("prefers look-alike options", () => {
    const pool = [target, w(2, "comiste", "(you) ate"), w(3, "bebiste", "(you) drank"), w(4, "viviste", "(you) lived"), w(5, "el perro grande", "the big dog")];
    expect(pickDistractors(target, pool, true, noJitter).sort()).toEqual([2, 3, 4]);
  });

  it("prefers the same verb form over a look-alike of another kind", () => {
    const estuve = w(1, "estuve", "(I) was", "was");
    const pool = [estuve, w(2, "nueve", "nine"), w(3, "diecinueve", "nineteen"), w(4, "comí", "(I) ate"), w(5, "fui", "(I) went"), w(6, "tuve", "(I) had")];
    expect(pickDistractors(estuve, pool, true, noJitter).sort()).toEqual([4, 5, 6]);
  });

  it("skips options that contain the answer or another option", () => {
    const bello = w(1, "bello", "beautiful");
    const pool = [bello, w(2, "tan bello", "so beautiful"), w(3, "feo", "ugly"), w(4, "muy feo", "very ugly"), w(5, "alto", "tall"), w(6, "bajo", "short")];
    const ids = pickDistractors(bello, pool, false, noJitter);
    expect(ids).not.toContain(2);
    expect(ids.filter((id) => id === 3 || id === 4)).toHaveLength(1);
  });

  it("returns fewer options when the pool is small", () => {
    expect(pickDistractors(target, [target, w(2, "casa", "house")], false, noJitter)).toEqual([2]);
  });
});
