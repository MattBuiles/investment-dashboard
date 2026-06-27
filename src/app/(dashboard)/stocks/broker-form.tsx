"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createBroker, updateBroker, type BrokerFormState } from "./actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export type BrokerInitial = {
  id: string;
  name: string;
  institution: string | null;
  currency: string;
};

export function BrokerForm({
  onDone,
  initial,
}: {
  onDone?: () => void;
  initial?: BrokerInitial;
}) {
  const action = initial ? updateBroker.bind(null, initial.id) : createBroker;

  const [state, formAction, pending] = useActionState<BrokerFormState, FormData>(
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
          <label htmlFor="name" className="text-sm font-medium">Nombre cuenta</label>
          <input id="name" name="name" required className={inputCls} defaultValue={initial?.name ?? ""} placeholder="IBKR USD, Bancolombia Acciones, etc." />
        </div>
        <div>
          <label htmlFor="institution" className="text-sm font-medium">Broker</label>
          <input id="institution" name="institution" required className={inputCls} defaultValue={initial?.institution ?? ""} placeholder="Interactive Brokers" />
        </div>
        <div>
          <label htmlFor="currency" className="text-sm font-medium">Currency</label>
          <input id="currency" name="currency" required maxLength={3} minLength={3} className={inputCls} defaultValue={initial?.currency ?? "USD"} />
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
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar broker"}
        </Button>
      </div>
    </form>
  );
}
