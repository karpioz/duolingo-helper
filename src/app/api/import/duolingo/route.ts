import { duolingoImportSchema } from "@/importers/duolingo/protocol";
import { saveDuolingoImport } from "@/importers/duolingo/save";
import { assertUser } from "@/server/session";

/**
 * Only the app's own /import page may call this (it relays the collector's words). Blocks
 * cross-site requests that would ride on the session cookie: browsers set Sec-Fetch-Site and
 * Origin themselves, and a page can't fake them.
 */
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  // JSON only: a cross-site JSON POST needs a CORS preflight, which this app never grants.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Send the import as JSON." }, { status: 415 });
  }

  try {
    await assertUser();
  } catch {
    return Response.json({ error: "Sign in to Duolingo Helper first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = duolingoImportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid import payload.", issues: parsed.error.issues.slice(0, 10) }, { status: 400 });
  }

  const result = await saveDuolingoImport(parsed.data);
  return Response.json(result);
}
