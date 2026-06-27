"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { createAccount, type AccountFormState } from "./actions";

type Kind = "cdt" | "custom";

const inputCls =
  "mt-1 block w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none";

export function AccountForm({ onDone }: { onDone?: () => void }) {
  const [kind, setKind] = useState<Kind>("cdt");
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    createAccount,
    undefined
  );

  if (state?.ok && onDone) {
    onDone();
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />

      <div>
        <label className="text-sm font-medium">Kind</label>
        <div className="mt-2 flex gap-2">
          {(["cdt", "custom"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={
                "rounded-full border px-4 py-1.5 text-sm transition-colors " +
                (kind === k
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]")
              }
            >
              {k === "cdt" ? "CDT" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input id="name" name="name" required className={inputCls} placeholder="My CDT" />
        </div>

        <div className={kind === "custom" ? "col-span-2" : ""}>
          <label htmlFor="institution" className="text-sm font-medium">
            Institution {kind === "custom" && <span className="text-[var(--muted)]">(optional)</span>}
          </label>
          <input
            id="institution"
            name="institution"
            required={kind === "cdt"}
            className={inputCls}
            placeholder={kind === "cdt" ? "Bancolombia" : "Coinbase / Vault / etc."}
          />
        </div>

        {kind === "cdt" && (
          <div>
            <label htmlFor="currency" className="text-sm font-medium">
              Currency
            </label>
            <input
              id="currency"
              name="currency"
              required
              maxLength={3}
              minLength={3}
              className={inputCls}
              defaultValue="USD"
            />
          </div>
        )}
      </div>

      {kind === "cdt" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="principal" className="text-sm font-medium">
              Principal
            </label>
            <input
              id="principal"
              name="principal"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="interest_rate" className="text-sm font-medium">
              Interest rate (decimal)
            </label>
            <input
              id="interest_rate"
              name="interest_rate"
              type="number"
              step="0.0001"
              min="0"
              max="1"
              required
              className={inputCls}
              placeholder="0.105"
            />
          </div>
          <div>
            <label htmlFor="term_months" className="text-sm font-medium">
              Term (months)
            </label>
            <input
              id="term_months"
              name="term_months"
              type="number"
              min="1"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="start_date" className="text-sm font-medium">
              Start date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="maturity_date" className="text-sm font-medium">
              Maturity date
            </label>
            <input
              id="maturity_date"
              name="maturity_date"
              type="date"
              required
              className={inputCls}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="currency-c" className="text-sm font-medium">
              Currency
            </label>
            <input
              id="currency-c"
              name="currency"
              required
              maxLength={3}
              minLength={3}
              className={inputCls}
              defaultValue="USD"
            />
          </div>
          <div>
            <label htmlFor="principal-c" className="text-sm font-medium">
              Current value
            </label>
            <input
              id="principal-c"
              name="principal"
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <input id="notes" name="notes" className={inputCls} placeholder="Wallet address, location, etc." />
          </div>
        </div>
      )}

      {state && !state.ok && (
        <p className="text-sm text-[var(--negative)]">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onDone && (
          <Button type="button" variant="secondary" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add account"}
        </Button>
      </div>
    </form>
  );
}
