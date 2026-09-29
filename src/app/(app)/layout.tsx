import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/server/session";

/** Every app page requires a signed-in, allowlisted user. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Per-request (session cookies); tells Next up front so it doesn't try to prerender.
  await connection();
  const user = await requireUser();
  return (
    <>
      <SiteHeader email={user.email} />
      {children}
    </>
  );
}
