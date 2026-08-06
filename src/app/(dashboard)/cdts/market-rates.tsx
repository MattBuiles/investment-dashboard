"use client";

import { Tabs, type TabDef } from "invest-ui";
import { Card, CardContent } from "@/components/ui/card";
import {
  CDT_TERMS,
  marketStats,
  type RatesByTerm,
} from "@/lib/cdt-rates";

function RateList({ rates }: { rates: RatesByTerm[string] }) {
  if (rates.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No se pudo obtener datos. Reintenta más tarde.
      </p>
    );
  }
  const stats = marketStats(rates);
  return (
    <>
      {stats && (
        <p className="mb-3 text-xs text-[var(--muted)]">
          Promedio {stats.avg.toFixed(2)}% · top {stats.top.toFixed(2)}% · corte{" "}
          {rates[0].cutoff_date}
        </p>
      )}
      <ul className="divide-y divide-[var(--border)]">
        {rates.map((r, i) => (
          <li key={r.bank} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="w-6 text-right text-xs text-[var(--muted)] tabular-nums">
              {i + 1}.
            </span>
            <span className="flex-1 truncate">{r.bank}</span>
            <span className="font-semibold tabular-nums">
              {r.rate.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function MarketRatesSection({
  ratesByTerm,
}: {
  ratesByTerm: RatesByTerm;
}) {
  const tabs: TabDef[] = CDT_TERMS.map((t) => ({
    id: t.desc,
    label: t.label,
    content: <RateList rates={ratesByTerm[t.desc] ?? []} />,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Mejores tasas CDT del mercado</h2>
          <span className="text-xs text-[var(--muted)]">Superfinanciera</span>
        </div>
        <div className="mt-4">
          <Tabs tabs={tabs} />
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Datos oficiales Superfinanciera de Colombia · datos.gov.co · cache 1h
        </p>
      </CardContent>
    </Card>
  );
}
