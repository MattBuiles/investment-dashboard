"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfile, type ProfileFormState } from "./actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

const COMMON = ["USD", "COP", "EUR", "MXN", "PEN", "CLP", "ARS", "BRL", "GBP", "JPY"];

export function ProfileForm({
  initial,
}: {
  initial: { base_currency: string; display_name: string | null };
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="display_name" className="text-sm font-medium">
          Nombre <span className="text-[var(--muted)]">(opcional)</span>
        </label>
        <input
          id="display_name"
          name="display_name"
          className={inputCls}
          defaultValue={initial.display_name ?? ""}
          placeholder="Tu nombre"
        />
      </div>

      <div>
        <label htmlFor="base_currency" className="text-sm font-medium">
          Moneda base
        </label>
        <select
          id="base_currency"
          name="base_currency"
          required
          defaultValue={initial.base_currency}
          className={inputCls}
        >
          {COMMON.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Todos los totales del overview se convierten a esta moneda con FX diario.
        </p>
      </div>

      {state && (state.ok ? (
        <p className="text-sm text-[var(--positive)]">Guardado.</p>
      ) : (
        <p className="text-sm text-[var(--negative)]">{state.error}</p>
      ))}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
