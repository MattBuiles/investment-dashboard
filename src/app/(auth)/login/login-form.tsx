"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "./actions";

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
    >
      <path
        d="M21.6 12.227c0-.71-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.89-1.74 2.986-4.302 2.986-7.351Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.614-2.422l-3.227-2.51c-.895.6-2.04.955-3.387.955-2.605 0-4.81-1.76-5.6-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.9a6.013 6.013 0 0 1 0-3.8V7.51H3.064a10 10 0 0 0 0 8.98L6.4 13.9Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.468 0 2.787.505 3.823 1.495l2.864-2.864C16.96 3.045 14.695 2 12 2A9.997 9.997 0 0 0 3.064 7.51L6.4 10.1C7.19 7.736 9.395 5.977 12 5.977Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={pending}>
      <GoogleIcon />
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}

export function LoginForm({ error }: { error?: string }) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Use your Google account to access the dashboard.
      </p>

      <form action={signInWithGoogle} className="mt-8">
        <SubmitButton />
      </form>

      {error && (
        <p className="mt-4 text-center text-sm text-[var(--negative)]">{error}</p>
      )}

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        By signing in you agree to keep an eye on your portfolio responsibly.
      </p>
    </>
  );
}
