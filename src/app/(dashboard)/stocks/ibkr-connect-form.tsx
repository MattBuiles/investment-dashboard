"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { connectIbkrFlex, type ConnectFormState } from "./broker-connection-actions";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export function IbkrConnectForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState<ConnectFormState, FormData>(
    connectIbkrFlex,
    undefined
  );

  useEffect(() => {
    if (state?.ok && onDone) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
        <summary className="cursor-pointer font-medium text-[var(--foreground)]">
          ¿Cómo activar Flex y obtener el token + Query ID?
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4">
          <li>
            IBKR Client Portal → <b>Performance &amp; Reports → Flex Queries</b>.
          </li>
          <li>
            Crea un <b>Activity Flex Query</b> e incluye la sección{" "}
            <b>Open Positions</b> con los campos: Symbol, Quantity (position),
            Cost Basis Price, Mark Price, Currency, Asset Class y Conid.
            Formato: <b>XML</b>. Guarda la query.
          </li>
          <li>
            Copia el <b>Query ID</b> (icono ℹ️ Info a la izquierda de la query).
          </li>
          <li>
            En la misma página, sección <b>Flex Web Service Configuration</b> →
            icono Configurar → marca <b>Flex Web Service Status</b> → Save.
          </li>
          <li>
            <b>Generate a New Token</b> → elige expiración (hasta 1 año) →{" "}
            <b>copia el token de inmediato</b> (no se vuelve a mostrar).
          </li>
          <li>Pega el Query ID y el token aquí abajo.</li>
        </ol>
        <a
          href="https://www.ibkrguides.com/clientportal/performanceandstatements/flex-web-service.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-[var(--accent)] hover:underline"
        >
          Guía oficial de IBKR ↗
        </a>
      </details>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="label" className="text-sm font-medium">Etiqueta</label>
          <input id="label" name="label" required className={inputCls} placeholder="IBKR USD" defaultValue="IBKR" />
        </div>
        <div>
          <label htmlFor="currency" className="text-sm font-medium">Currency</label>
          <input id="currency" name="currency" required maxLength={3} minLength={3} className={inputCls} defaultValue="USD" />
        </div>
        <div className="col-span-2">
          <label htmlFor="flex_query_id" className="text-sm font-medium">Flex Query ID</label>
          <input id="flex_query_id" name="flex_query_id" required className={inputCls} placeholder="123456789" />
        </div>
        <div className="col-span-2">
          <label htmlFor="flex_token" className="text-sm font-medium">Flex Token</label>
          <input
            id="flex_token"
            name="flex_token"
            type="password"
            autoComplete="off"
            required
            className={inputCls}
            placeholder="Pegar token (se cifra antes de guardar)"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Cifrado vía Supabase Vault (pgsodium). Nunca expuesto al browser después.
          </p>
        </div>
        <div className="col-span-2">
          <label htmlFor="token_expires_at" className="text-sm font-medium">
            Token expira <span className="text-[var(--muted)]">(opcional, IBKR lo define)</span>
          </label>
          <input
            id="token_expires_at"
            name="token_expires_at"
            type="date"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Te avisamos cuando falten menos de 30 días.
          </p>
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
          {pending ? "Conectando…" : "Conectar IBKR"}
        </Button>
      </div>
    </form>
  );
}
