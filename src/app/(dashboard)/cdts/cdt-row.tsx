"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CdtForm, type CdtInitial } from "./cdt-form";
import { deleteCdt } from "./actions";

type Cdt = CdtInitial & {
  name: string;
};

export function CdtRow({ cdt }: { cdt: Cdt }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="px-6 py-4 bg-[var(--surface-2)]">
        <CdtForm
          initial={cdt}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 px-6 py-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{cdt.name}</p>
        <p className="text-xs text-[var(--muted)] mt-1 truncate">
          {cdt.institution}
          {cdt.interest_rate != null && (
            <> · {(Number(cdt.interest_rate) * 100).toFixed(2)}% · {cdt.term_months} meses</>
          )}
          {cdt.maturity_date && <> · vence {cdt.maturity_date}</>}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium tabular-nums">
          {formatCurrency(Number(cdt.principal ?? 0), cdt.currency)}
        </p>
        <p className="text-xs text-[var(--muted)]">{cdt.currency}</p>
      </div>
      <button
        type="button"
        aria-label={`Editar ${cdt.name}`}
        onClick={() => setEditing(true)}
        className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Eliminar ${cdt.name}`}
        onClick={async () => {
          if (!confirm(`Eliminar ${cdt.name}?`)) return;
          await deleteCdt(cdt.id);
        }}
        className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--negative)]"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
