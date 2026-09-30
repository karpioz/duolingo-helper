"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isAllowedEmail } from "@/server/session";

export type AuthFormState = { error: string } | null;

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export async function signInWithEmail(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const { error } = await auth.signIn.email({ email, password });
  if (error) return { error: error.message || "Could not sign in. Check your email and password." };
  redirect(isAllowedEmail(email) ? "/" : "/auth/not-authorized");
}

export async function signOut() {
  await auth.signOut();
  redirect("/auth/sign-in");
}
