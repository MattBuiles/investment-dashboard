"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn, signUp, type AuthState } from "./actions";

type Mode = "signin" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {mode === "signin"
          ? "Use your account to access the dashboard."
          : "Set up a new dashboard account."}
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            className="mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-[var(--negative)]">{state.error}</p>
        )}
        {state?.message && (
          <p className="text-sm text-[var(--positive)]">{state.message}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending
            ? "Loading…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </>
  );
}
