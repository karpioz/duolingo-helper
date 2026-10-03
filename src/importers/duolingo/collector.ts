import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The collector script (browser-script.js) ready to paste into the console on duolingo.com,
 * pointed at `appUrl`. The file is included in the /import route's trace (next.config.ts).
 */
export async function collectorScript(appUrl: string): Promise<string> {
  const source = await readFile(path.join(process.cwd(), "src/importers/duolingo/browser-script.js"), "utf8");
  return `window.DUOLINGO_HELPER_URL = ${JSON.stringify(appUrl)};\n${source}`;
}
