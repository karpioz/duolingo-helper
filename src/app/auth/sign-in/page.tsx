import type { Metadata } from "next";
import { signInWithEmail } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in · Duolingo Helper" };

export default function SignInPage() {
  return <AuthForm action={signInWithEmail} />;
}
