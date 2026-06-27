"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createHolding, updateHolding, type HoldingFormState } from "./actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export type HoldingInitial = {
  id: string;
  symbol: string;
  quantity: number | string;
  avg_cost: number | string;
  currency: string;
};

export function HoldingForm({
  accountId,
  defaultCurrency,
  onDone,
  initial,
}: {
  accountId: string;
  defaultCurrency: string;
  onDone?: () => void;
  initial?: HoldingInitial;
}) {
  const action = initial ? updateHolding.bind(null, initial.id) : createHolding;

  const [state, formAction, pending] = useActionState<HoldingFormState, FormData>(
    action,
    undefined
  );

  useEffect(() => {
    if (state?.ok && onDone) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="account_id" value={accountId} />

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-[var(--muted)]">Symbol</label>
          <input name="symbol" required className={inputCls} defaultValue={initial?.symbol ?? ""} placeholder="AAPL" />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Qty</label>
          <input name="quantity" type="number" step="0.00000001" min="0" required className={inputCls} defaultValue={initial?.quantity ?? ""} />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Avg cost</label>
          <input name="avg_cost" type="number" step="0.0001" min="0" required className={inputCls} defaultValue={initial?.avg_cost ?? ""} />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Currency</label>
          <input name="currency" required maxLength={3} minLength={3} className={inputCls} defaultValue={initial?.currency ?? defaultCurrency} />
        </div>
      </div>

      {state && !state.ok && (
        <p className="text-sm text-[var(--negative)]">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="secondary" size="sm" onClick={onDone}>Cancel</Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : initial ? "Guardar" : "Add"}
        </Button>
      </div>
    </form>
  );
}
