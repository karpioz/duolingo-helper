/**
 * Spaced repetition (FSRS via ts-fsrs). One card per word and direction; every answer is a review.
 */
import { createEmptyCard, fsrs, Rating, TypeConvert, type Card, type Grade } from "ts-fsrs";
import type { MatchKind } from "./answers";

/**
 * - Fuzz spreads reviews so words learned together don't all come due on the same day.
 * - No short-term (minute-level) learning steps: these words were already learned on Duolingo,
 *   so a review is at least a day out. Same-day practice is "Retest missed" / "Missed last time".
 */
export const scheduler = fsrs({ enable_fuzz: true, enable_short_term: false, maximum_interval: 365 });

/** Wrong → Again, almost (typo / missing accent) → Hard, correct → Good. */
export function gradeFor(kind: MatchKind): Grade {
  if (kind === "wrong") return Rating.Again;
  if (kind === "almost") return Rating.Hard;
  return Rating.Good;
}

/** Applies one review. `stored` is the card as saved in jsonb (dates as ISO strings), or null. */
export function reviewCard(stored: unknown, grade: Grade, now: Date): Card {
  const card = stored ? TypeConvert.card(stored as Card) : createEmptyCard(now);
  // Reviews must not go back in time (e.g. clock skew): never earlier than the last review.
  const at = card.last_review && card.last_review > now ? card.last_review : now;
  const next = scheduler.next(card, at, grade).card;
  // A word you just got wrong comes back tomorrow, however well known it was before
  // (FSRS alone can schedule a lapse of a mature word days out). Stability is left as computed.
  const tomorrow = new Date(at.getTime() + 86_400_000);
  if (grade === Rating.Again && next.due > tomorrow) {
    return { ...next, due: tomorrow, scheduled_days: 1 };
  }
  return next;
}

/** "now", "in 10 min", "in 5 h", "in 3 d", "in 2 mo" — relative to `now`. */
export function formatDue(due: Date, now: Date): string {
  const mins = Math.round((due.getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 60) return `in ${days} d`;
  return `in ${Math.round(days / 30)} mo`;
}
