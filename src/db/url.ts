/**
 * Neon URLs use `sslmode=require`, which node-postgres now treats as `verify-full`
 * and warns about. Ask for `verify-full` explicitly: same behaviour, no warning.
 */
export function pgUrl(url: string | undefined): string {
  if (!url) throw new Error("Database URL is not set. Run `neon env pull` to create .env.local.");
  return url.replace(/sslmode=require\b/, "sslmode=verify-full");
}
