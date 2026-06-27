"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { rotateIbkrFlexToken, type RotateFormState } from "./broker-connection-actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export function IbkrRotateForm({
  connectionId,
  onDone,
}: {
  connectionId: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<RotateFormState, FormData>(
    rotateIbkrFlexToken,
    undefined
  );

  useEffect(() => {
    if (state?.ok && onDone) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="connection_id" value={connectionId} />

      <p className="text-xs text-[var(--muted)]">
        Genera nuevo token en IBKR Client Portal y pégalo. El anterior se sobrescribe en Vault.
      </p>

      <div>
        <label htmlFor="flex_token" className="text-sm font-medium">Nuevo Flex Token</label>
        <input
          id="flex_token"
          name="flex_token"
          type="password"
          autoComplete="off"
          required
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="flex_query_id" className="text-sm font-medium">
            Flex Query ID <span className="text-[var(--muted)]">(opcional, si cambió)</span>
          </label>
          <input id="flex_query_id" name="flex_query_id" className={inputCls} />
        </div>
        <div>
          <label htmlFor="token_expires_at" className="text-sm font-medium">Nueva expiración</label>
          <input id="token_expires_at" name="token_expires_at" type="date" className={inputCls} />
        </div>
      </div>

      {state && !state.ok && (
        <p className="text-sm text-[var(--negative)]">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onDone && (
          <Button type="button" variant="secondary" size="sm" onClick={onDone}>Cancel</Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Rotando…" : "Rotar token"}
        </Button>
      </div>
    </form>
  );
}
