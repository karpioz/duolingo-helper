import { z } from "zod";

/**
 * Messages exchanged between the collector script (running on duolingo.com) and the app's
 * /import page, via window.postMessage. Keep in sync with browser-script.js.
 */
export const DUOLINGO_ORIGIN = "https://www.duolingo.com";
export const MSG_READY = "duolingo-helper:ready";
export const MSG_IMPORT = "duolingo-helper:import";
export const MSG_RESULT = "duolingo-helper:result";

export const duolingoImportSchema = z.object({
  source: z.literal("duolingo"),
  /** "<learning>-<from>", e.g. "es-en". */
  course: z.string().regex(/^[a-z]{2,3}(-[a-zA-Z]{2,4})?-[a-z]{2,3}(-[a-zA-Z]{2,4})?$/),
  /** Ordered as Duolingo returned them (most recently learned first). */
  words: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(200),
        translations: z.array(z.string().trim().max(300)).max(50),
        audioURL: z.url().nullish(),
      }),
    )
    .min(1)
    .max(20_000),
});

export type DuolingoImport = z.infer<typeof duolingoImportSchema>;

export type ImportResult = {
  received: number;
  unique: number;
  inserted: number;
  updated: number;
  translations: number;
};
