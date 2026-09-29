import { Rating, State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { formatDue, gradeFor, reviewCard } from "./srs";

const t0 = new Date("2026-09-29T10:00:00Z");
const DAY = 86_400_000;

describe("gradeFor", () => {
  it("maps answer kinds to FSRS ratings", () => {
    expect(gradeFor("wrong")).toBe(Rating.Again);
    expect(gradeFor("almost")).toBe(Rating.Hard);
    expect(gradeFor("exact")).toBe(Rating.Good);
  });
});

describe("reviewCard", () => {
  it("starts a new card and survives a JSON round trip (as stored in jsonb)", () => {
    const first = reviewCard(null, Rating.Good, t0);
    expect(first.reps).toBe(1);
    const stored = JSON.parse(JSON.stringify(first));
    const second = reviewCard(stored, Rating.Good, new Date(first.due.getTime() + 1000));
    expect(second.reps).toBe(2);
    expect(second.due.getTime()).toBeGreaterThan(first.due.getTime());
  });

  it("brings a forgotten word back much sooner than a known one", () => {
    // Build up a word answered correctly on schedule a few times.
    let card = reviewCard(null, Rating.Good, t0);
    for (let i = 0; i < 4; i++) card = reviewCard(card, Rating.Good, card.due);
    expect(card.state).toBe(State.Review);

    const known = reviewCard(card, Rating.Good, card.due);
    const forgotten = reviewCard(card, Rating.Again, card.due);
    expect(forgotten.lapses).toBe(card.lapses + 1);
    expect(forgotten.due.getTime() - card.due.getTime()).toBeLessThanOrEqual(DAY);
    expect(known.due.getTime() - card.due.getTime()).toBeGreaterThan(7 * DAY);
  });

  it("schedules at least a day out (no minute-level learning steps)", () => {
    const wrong = reviewCard(null, Rating.Again, t0);
    const right = reviewCard(null, Rating.Good, t0);
    expect(wrong.due.getTime() - t0.getTime()).toBeGreaterThanOrEqual(DAY - 1000);
    expect(right.due.getTime()).toBeGreaterThan(wrong.due.getTime());
  });

  it("never reviews before the previous review", () => {
    const card = reviewCard(null, Rating.Good, t0);
    const earlier = new Date(t0.getTime() - DAY);
    expect(() => reviewCard(card, Rating.Good, earlier)).not.toThrow();
  });
});

describe("formatDue", () => {
  it("formats relative times", () => {
    expect(formatDue(new Date(t0.getTime() - 1000), t0)).toBe("now");
    expect(formatDue(new Date(t0.getTime() + 10 * 60_000), t0)).toBe("in 10 min");
    expect(formatDue(new Date(t0.getTime() + 5 * 3_600_000), t0)).toBe("in 5 h");
    expect(formatDue(new Date(t0.getTime() + 3 * DAY), t0)).toBe("in 3 d");
    expect(formatDue(new Date(t0.getTime() + 90 * DAY), t0)).toBe("in 3 mo");
  });
});
