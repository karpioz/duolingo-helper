import type { Metadata } from "next";
import { signUpWithEmail } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account · Duolingo Helper" };

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUpWithEmail} />;
}
