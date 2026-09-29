import { auth } from "@/lib/auth/server";

/** Redirects signed-out visitors to the sign-in page and refreshes sessions. */
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  // Pages only: API routes check the session themselves (and return 401 rather than redirect).
  matcher: ["/((?!auth|api|_next/static|_next/image|favicon.ico).*)"],
};
