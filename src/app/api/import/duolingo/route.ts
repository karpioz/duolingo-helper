import { duolingoImportSchema } from "@/importers/duolingo/protocol";
import { saveDuolingoImport } from "@/importers/duolingo/save";
import { assertUser } from "@/server/session";

export async function POST(request: Request) {
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
