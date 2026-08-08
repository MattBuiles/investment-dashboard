"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useConfirm, useToast } from "strata";
import { formatCurrency } from "@/lib/utils";
import { CustomForm, type CustomInitial } from "./custom-form";
import { deleteCustom } from "./actions";

export function CustomRow({ item }: { item: CustomInitial }) {
  const [editing, setEditing] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  if (editing) {
    return (
      <li className="px-6 py-4 bg-[var(--surface-2)]">
        <CustomForm initial={item} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 px-6 py-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        <p className="text-xs text-[var(--muted)] mt-1 truncate">
          {item.institution ?? "—"}
          {item.notes && <> · {item.notes}</>}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium tabular-nums">
          {formatCurrency(Number(item.principal ?? 0), item.currency)}
        </p>
        <p className="text-xs text-[var(--muted)]">{item.currency}</p>
      </div>
      <button
        type="button"
        aria-label={`Editar ${item.name}`}
        onClick={() => setEditing(true)}
        className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Eliminar ${item.name}`}
        onClick={async () => {
          if (
            !(await confirm({
              title: "Eliminar activo",
              message: `¿Eliminar ${item.name}?`,
              confirmLabel: "Eliminar",
              danger: true,
            }))
          )
            return;
          try {
            await deleteCustom(item.id);
            toast({ message: `${item.name} eliminado`, tone: "success" });
          } catch (e) {
            toast({
              message: e instanceof Error ? e.message : "No se pudo eliminar",
              tone: "error",
            });
          }
        }}
        className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--negative)]"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
