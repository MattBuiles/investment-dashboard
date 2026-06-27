"use client";

import { Trash2 } from "lucide-react";
import { deleteAccount } from "./actions";

export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  return (
    <button
      type="button"
      aria-label={`Delete ${name}`}
      onClick={async () => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
        await deleteAccount(id);
      }}
      className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--negative)]"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
