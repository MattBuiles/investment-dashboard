"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createCdt, updateCdt, type CdtFormState } from "./actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export type CdtInitial = {
  id: string;
  name: string;
  institution: string | null;
  currency: string;
  principal: number | string | null;
  interest_rate: number | string | null;
  term_months: number | null;
  start_date: string | null;
  maturity_date: string | null;
};

export function CdtForm({
  onDone,
  initial,
}: {
  onDone?: () => void;
  initial?: CdtInitial;
}) {
  const action = initial
    ? updateCdt.bind(null, initial.id)
    : createCdt;

  const [state, formAction, pending] = useActionState<CdtFormState, FormData>(
    action,
    undefined
  );

  useEffect(() => {
    if (state?.ok && onDone) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" name="name" required className={inputCls} defaultValue={initial?.name ?? ""} placeholder="CDT Bancolombia 12m" />
        </div>
        <div>
          <label htmlFor="institution" className="text-sm font-medium">Banco</label>
          <input id="institution" name="institution" required className={inputCls} defaultValue={initial?.institution ?? ""} placeholder="Bancolombia" />
        </div>
        <div>
          <label htmlFor="currency" className="text-sm font-medium">Currency</label>
          <input id="currency" name="currency" required maxLength={3} minLength={3} className={inputCls} defaultValue={initial?.currency ?? "COP"} />
        </div>
        <div>
          <label htmlFor="principal" className="text-sm font-medium">Monto</label>
          <input id="principal" name="principal" type="number" step="0.01" min="0" required className={inputCls} defaultValue={initial?.principal ?? ""} />
        </div>
        <div>
          <label htmlFor="interest_rate" className="text-sm font-medium">Tasa (decimal)</label>
          <input id="interest_rate" name="interest_rate" type="number" step="0.0001" min="0" max="1" required className={inputCls} defaultValue={initial?.interest_rate ?? ""} placeholder="0.105" />
        </div>
        <div>
          <label htmlFor="term_months" className="text-sm font-medium">Plazo (meses)</label>
          <input id="term_months" name="term_months" type="number" min="1" required className={inputCls} defaultValue={initial?.term_months ?? ""} />
        </div>
        <div>
          <label htmlFor="start_date" className="text-sm font-medium">Fecha emisión</label>
          <input id="start_date" name="start_date" type="date" required className={inputCls} defaultValue={initial?.start_date ?? ""} />
        </div>
        <div className="col-span-2">
          <label htmlFor="maturity_date" className="text-sm font-medium">Fecha vencimiento</label>
          <input id="maturity_date" name="maturity_date" type="date" required className={inputCls} defaultValue={initial?.maturity_date ?? ""} />
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
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar CDT"}
        </Button>
      </div>
    </form>
  );
}
