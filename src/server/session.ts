import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

/**
 * Single-owner app: only emails listed in ALLOWED_EMAILS (comma-separated) may sign up or use it.
 * If the variable is empty, nobody is allowed — safer than accidentally opening the app to everyone.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export type SessionUser = { id: string; email: string; name: string };

async function currentUser(): Promise<SessionUser | null> {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

/** For pages and layouts: redirects when signed out or not on the allowlist. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/auth/sign-in");
  if (!isAllowedEmail(user.email)) redirect("/auth/not-authorized");
  return user;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user || !isAllowedEmail(user.email)) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthorizedError";
  }
}
