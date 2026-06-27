"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createCustom, updateCustom, type CustomFormState } from "./actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export type CustomInitial = {
  id: string;
  name: string;
  institution: string | null;
  currency: string;
  principal: number | string | null;
  notes?: string;
};

export function CustomForm({
  onDone,
  initial,
}: {
  onDone?: () => void;
  initial?: CustomInitial;
}) {
  const action = initial
    ? updateCustom.bind(null, initial.id)
    : createCustom;

  const [state, formAction, pending] = useActionState<CustomFormState, FormData>(
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
          <label htmlFor="name" className="text-sm font-medium">Nombre</label>
          <input id="name" name="name" required className={inputCls} defaultValue={initial?.name ?? ""} placeholder="Apartamento, BTC wallet, etc." />
        </div>
        <div>
          <label htmlFor="institution" className="text-sm font-medium">
            Custodio <span className="text-[var(--muted)]">(opcional)</span>
          </label>
          <input id="institution" name="institution" className={inputCls} defaultValue={initial?.institution ?? ""} placeholder="Coinbase, escritura, etc." />
        </div>
        <div>
          <label htmlFor="currency" className="text-sm font-medium">Currency</label>
          <input id="currency" name="currency" required maxLength={3} minLength={3} className={inputCls} defaultValue={initial?.currency ?? "USD"} />
        </div>
        <div className="col-span-2">
          <label htmlFor="principal" className="text-sm font-medium">Valor actual</label>
          <input id="principal" name="principal" type="number" step="0.01" min="0" required className={inputCls} defaultValue={initial?.principal ?? ""} />
        </div>
        <div className="col-span-2">
          <label htmlFor="notes" className="text-sm font-medium">Notas</label>
          <input id="notes" name="notes" className={inputCls} defaultValue={initial?.notes ?? ""} placeholder="Dirección, ubicación, detalles…" />
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
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar activo"}
        </Button>
      </div>
    </form>
  );
}
