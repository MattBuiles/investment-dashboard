"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge, Sparkline, useConfirm, useToast } from "strata";
import { formatCurrency } from "@/lib/utils";
import {
  marketStats,
  nearestTerm,
  type RatesByTerm,
} from "@/lib/cdt-rates";
import { CdtForm, type CdtInitial } from "./cdt-form";
import { deleteCdt } from "./actions";

type Cdt = CdtInitial & {
  name: string;
};

// Días hasta el vencimiento (null si no hay fecha).
function daysToMaturity(maturity?: string | null): number | null {
  if (!maturity) return null;
  const end = new Date(maturity + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today.getTime()) / 86400000);
}

// Compara la tasa del CDT (decimal) contra la banda de mercado del mismo plazo.
function marketComparison(cdt: Cdt, ratesByTerm?: RatesByTerm) {
  if (!ratesByTerm || cdt.interest_rate == null) return null;
  const term = nearestTerm(cdt.term_months);
  const stats = marketStats(ratesByTerm[term.desc] ?? []);
  if (!stats) return null;
  const yourPct = Number(cdt.interest_rate) * 100;
  if (!Number.isFinite(yourPct)) return null;
  return { term, stats, yourPct, deltaVsAvg: yourPct - stats.avg };
}

export function CdtRow({
  cdt,
  marketRatesByTerm,
  rateHistory,
}: {
  cdt: Cdt;
  marketRatesByTerm?: RatesByTerm;
  rateHistory?: number[];
}) {
  const [editing, setEditing] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  if (editing) {
    return (
      <li className="px-6 py-4 bg-[var(--surface-2)]">
        <CdtForm
          initial={cdt}
          marketRatesByTerm={marketRatesByTerm}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  const days = daysToMaturity(cdt.maturity_date);
  const cmp = marketComparison(cdt, marketRatesByTerm);

  return (
    <li className="flex items-center gap-4 px-6 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{cdt.name}</p>
          {days != null && days < 0 && <Badge tone="down">Vencido</Badge>}
          {days != null && days >= 0 && days <= 30 && (
            <Badge tone="warn">Vence en {days}d</Badge>
          )}
          {cmp && cmp.yourPct >= cmp.stats.top && (
            <Badge tone="up">Top del mercado</Badge>
          )}
          {cmp && cmp.yourPct < cmp.stats.top && cmp.deltaVsAvg >= 0 && (
            <Badge tone="up">+{cmp.deltaVsAvg.toFixed(2)}% vs prom</Badge>
          )}
          {cmp && cmp.deltaVsAvg < 0 && (
            <Badge tone="warn">{cmp.deltaVsAvg.toFixed(2)}% vs prom</Badge>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] mt-1 truncate">
          {cdt.institution}
          {cdt.interest_rate != null && (
            <> · {(Number(cdt.interest_rate) * 100).toFixed(2)}% · {cdt.term_months} meses</>
          )}
          {cmp && (
            <> · mercado {cmp.term.label}: prom {cmp.stats.avg.toFixed(2)}% · top {cmp.stats.top.toFixed(2)}%</>
          )}
          {cdt.maturity_date && <> · vence {cdt.maturity_date}</>}
        </p>
      </div>
      {rateHistory && rateHistory.length >= 2 && (
        <div
          className="hidden sm:flex flex-col items-end"
          title={`Tendencia de tasa de mercado ${nearestTerm(cdt.term_months).label}`}
        >
          <Sparkline data={rateHistory} width={64} height={22} />
          <span className="mt-0.5 text-[10px] text-[var(--muted)]">
            mercado {nearestTerm(cdt.term_months).label}
          </span>
        </div>
      )}
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
          if (
            !(await confirm({
              title: "Eliminar CDT",
              message: `¿Eliminar ${cdt.name}?`,
              confirmLabel: "Eliminar",
              danger: true,
            }))
          )
            return;
          try {
            await deleteCdt(cdt.id);
            toast({ message: `${cdt.name} eliminado`, tone: "success" });
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
