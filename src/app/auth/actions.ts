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

export async function signUpWithEmail(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  const name = field(form, "name") || email.split("@")[0];
  if (!email || !password) return { error: "Enter your email and a password." };
  // Private app: don't even create accounts for addresses that can't use it.
  if (!isAllowedEmail(email)) return { error: "This app is private — sign-up is limited to its owner." };
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };

  const { error } = await auth.signUp.email({ email, password, name });
  if (error) return { error: error.message || "Could not create the account." };
  redirect("/");
}

export async function signOut() {
  await auth.signOut();
  redirect("/auth/sign-in");
}
