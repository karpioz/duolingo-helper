import { duolingoImportSchema } from "@/importers/duolingo/protocol";
import { saveDuolingoImport } from "@/importers/duolingo/save";

export async function POST(request: Request) {
  // No auth yet: only allow imports from a local dev server.
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Import is disabled in production until sign-in is added." }, { status: 403 });
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
