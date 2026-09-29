"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "./actions";

export function AuthForm({
  mode,
  action,
}: {
  mode: "sign-in" | "sign-up";
  action: (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const signUp = mode === "sign-up";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {signUp && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={signUp ? 8 : undefined}
          required
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Please wait…" : signUp ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {signUp ? (
          <>
            Already have an account? <Link className="underline" href="/auth/sign-in">Sign in</Link>
          </>
        ) : (
          <>
            First time here? <Link className="underline" href="/auth/sign-up">Create your account</Link>
          </>
        )}
      </p>
    </form>
  );
}
