"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useToast } from "strata";
import { Button } from "@/components/ui/button";
import { createCdt, updateCdt, type CdtFormState } from "./actions";
import {
  nearestTerm,
  rateForBank,
  type RatesByTerm,
} from "@/lib/cdt-rates";

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
  marketRatesByTerm,
}: {
  onDone?: () => void;
  initial?: CdtInitial;
  marketRatesByTerm?: RatesByTerm;
}) {
  const action = initial ? updateCdt.bind(null, initial.id) : createCdt;
  const toast = useToast();

  const [state, formAction, pending] = useActionState<CdtFormState, FormData>(
    action,
    undefined
  );

  // Controlados para poder prellenar la tasa según banco + plazo.
  const [bank, setBank] = useState(initial?.institution ?? "");
  const [months, setMonths] = useState(
    initial?.term_months != null ? String(initial.term_months) : ""
  );
  const [rate, setRate] = useState(
    initial?.interest_rate != null ? String(initial.interest_rate) : ""
  );

  useEffect(() => {
    if (state?.ok) {
      toast({
        message: initial ? "CDT actualizado" : "CDT agregado",
        tone: "success",
      });
      onDone?.();
    }
  }, [state, onDone, initial, toast]);

  // Bancos para autocompletar (de la banda a 360, la más poblada).
  const bankOptions = useMemo(() => {
    const list = marketRatesByTerm?.["A 360 DIAS"] ?? [];
    return [...new Set(list.map((r) => r.bank))];
  }, [marketRatesByTerm]);

  // Sugerencia de tasa de mercado (porcentaje) para el banco + plazo actuales.
  const suggestedPct = useMemo(() => {
    if (!marketRatesByTerm || !bank.trim() || !months) return null;
    const term = nearestTerm(Number(months));
    return rateForBank(marketRatesByTerm[term.desc] ?? [], bank);
  }, [marketRatesByTerm, bank, months]);

  // Tasa capturada está en decimal (0.105); el mercado viene en porcentaje.
  const currentPct = rate ? Number(rate) * 100 : null;
  const showSuggestion =
    suggestedPct != null &&
    (currentPct == null ||
      Math.abs(currentPct - suggestedPct) > 0.01);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" name="name" required className={inputCls} defaultValue={initial?.name ?? ""} placeholder="CDT Bancolombia 12m" />
        </div>
        <div>
          <label htmlFor="institution" className="text-sm font-medium">Banco</label>
          <input
            id="institution"
            name="institution"
            required
            list="cdt-bank-options"
            className={inputCls}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="Bancolombia"
          />
          {bankOptions.length > 0 && (
            <datalist id="cdt-bank-options">
              {bankOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          )}
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
          <input
            id="interest_rate"
            name="interest_rate"
            type="number"
            step="0.0001"
            min="0"
            max="1"
            required
            className={inputCls}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0.105"
          />
          {showSuggestion && (
            <button
              type="button"
              onClick={() => setRate((suggestedPct! / 100).toFixed(4))}
              className="mt-1.5 text-xs text-[var(--accent)] hover:underline"
            >
              Usar tasa de mercado: {suggestedPct!.toFixed(2)}%
            </button>
          )}
        </div>
        <div>
          <label htmlFor="term_months" className="text-sm font-medium">Plazo (meses)</label>
          <input
            id="term_months"
            name="term_months"
            type="number"
            min="1"
            required
            className={inputCls}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
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
