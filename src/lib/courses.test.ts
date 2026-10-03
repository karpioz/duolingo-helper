import { describe, expect, it } from "vitest";
import { checkAnswer } from "./answers";
import { courseInfo, directionLabels, isCourseId } from "./courses";

describe("courses", () => {
  it("parses Duolingo course ids", () => {
    const tr = courseInfo("tr-en");
    expect(tr.learning.name).toBe("Turkish");
    expect(tr.from.name).toBe("English");
    expect(tr.learning.specialChars).toContain("ı");
    expect(courseInfo("zh-CN-en").learning.code).toBe("zh");
    expect(courseInfo("xx-en").learning.name).toBe("XX");
    expect(isCourseId("es-en")).toBe(true);
    expect(isCourseId("es")).toBe(false);
  });
  it("labels directions with the course's languages", () => {
    expect(directionLabels(courseInfo("tr-en")).target_to_source).toBe("English → Turkish");
  });
});

describe("Turkish answers", () => {
  it("accepts a plain i for dotless ı (and missing cedillas) as almost", () => {
    expect(checkAnswer("ispanak", ["ıspanak"], { lenient: true }).kind).toBe("almost");
    expect(checkAnswer("tesekkurler", ["teşekkürler"], { lenient: true }).kind).toBe("almost");
    expect(checkAnswer("ıspanak", ["ıspanak"], { lenient: true }).kind).toBe("exact");
  });
});
