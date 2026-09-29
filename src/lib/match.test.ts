import { describe, expect, it } from "vitest";
import { buildBoards, pickLabel, tileFromKey, tileKey } from "./match";

describe("pickLabel", () => {
  it("prefers a hinted form and skips (?) questions", () => {
    expect(pickLabel(["(?) did you learn", "learn", "(you) learned", "learned"])).toBe("(you) learned");
  });
  it("falls back to the first plain translation", () => {
    expect(pickLabel(["woman"])).toBe("woman");
    expect(pickLabel(["(?) did you study"])).toBe("(?) did you study");
  });
});

describe("buildBoards", () => {
  const w = (id: number, ...translations: string[]) => ({ id, translations });

  it("fills boards of five in order", () => {
    const items = Array.from({ length: 15 }, (_, i) => w(i, `word${i}`));
    expect(buildBoards(items).map((b) => b.map((x) => x.id))).toEqual([
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
    ]);
  });

  it("never leaves a last board with fewer than three pairs when it can be avoided", () => {
    const items = Array.from({ length: 12 }, (_, i) => w(i, `word${i}`));
    expect(buildBoards(items).map((b) => b.length)).toEqual([4, 5, 3]);
  });

  it("never puts words with a shared translation on one board", () => {
    const items = [w(1, "woman"), w(2, "lady", "woman"), w(3, "man"), w(4, "(I) learned"), w(5, "learned")];
    const boards = buildBoards(items);
    for (const b of boards) {
      const ids = b.map((x) => x.id);
      expect(ids.includes(1) && ids.includes(2)).toBe(false); // share "woman"
      expect(ids.includes(4) && ids.includes(5)).toBe(false); // "(I) learned" allows "learned"
    }
    expect(boards.flat()).toHaveLength(5);
  });
});

describe("buildBoards rebalancing", () => {
  const w = (id: number, ...translations: string[]) => ({ id, translations });

  it("tops up a tiny last board from boards that can spare words", () => {
    // Word 10 conflicts with one word on each full board, so first-fit leaves it alone.
    const items = [
      w(1, "met"), w(2, "a"), w(3, "b"), w(4, "c"), w(5, "d"),
      w(6, "(I) met"), w(7, "e"), w(8, "f"), w(9, "g"), w(11, "h"),
      w(10, "(you) met"),
    ];
    const sizes = buildBoards(items).map((b) => b.length);
    expect(sizes.at(-1)).toBeGreaterThanOrEqual(3);
    expect(sizes.reduce((a, b) => a + b)).toBe(11);
    for (const board of buildBoards(items)) {
      const ids = board.map((x) => x.id);
      expect([1, 6, 10].filter((id) => ids.includes(id)).length).toBeLessThanOrEqual(1);
    }
  });
});

describe("tile keys", () => {
  it("maps 1–5 to the left column and 6–0 to the right", () => {
    expect(tileKey("left", 0)).toBe("1");
    expect(tileKey("right", 4)).toBe("0");
    expect(tileFromKey("3", 5)).toEqual({ column: "left", index: 2 });
    expect(tileFromKey("0", 5)).toEqual({ column: "right", index: 4 });
    expect(tileFromKey("5", 3)).toBeNull(); // smaller board
    expect(tileFromKey("8", 3)).toEqual({ column: "right", index: 2 });
    expect(tileFromKey("x", 5)).toBeNull();
  });
});
