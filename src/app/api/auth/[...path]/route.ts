import { auth } from "@/lib/auth/server";

const handler = auth.handler();

export const { GET, PUT, DELETE, PATCH } = handler;

/** Private app: sign-up is closed, so refuse it here too (the proxy would otherwise forward it to Neon Auth). */
export async function POST(request: Request, context: Parameters<typeof handler.POST>[1]) {
  if (new URL(request.url).pathname.startsWith("/api/auth/sign-up")) {
    return Response.json({ error: "Sign-up is disabled." }, { status: 403 });
  }
  return handler.POST(request, context);
}
