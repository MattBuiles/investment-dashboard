"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </form>
  );
}
