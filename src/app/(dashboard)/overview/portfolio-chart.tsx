"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Stat } from "strata";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  growthSummary,
  sliceByDate,
  type Range,
  type SeriesPoint,
} from "@/lib/history";
import { yAxisTick } from "./chart-utils";

export type ChartSeries = {
  recentDaily: SeriesPoint[];
  fullWeekly: SeriesPoint[];
  projected: SeriesPoint[];
};

type Row = { date: string; value: number | null; projected: number | null };

export function PortfolioChart({
  series,
  currency,
  range,
}: {
  series: ChartSeries;
  currency: string;
  range: Range;
}) {
  const [showProjection, setShowProjection] = useState(false);

  const source =
    range === "1M" || range === "3M" ? series.recentDaily : series.fullWeekly;
  const observed = useMemo(() => sliceByDate(source, range), [source, range]);
  const hasProjection = series.projected.length > 1;

  const rows: Row[] = useMemo(() => {
    const base: Row[] = observed.map((p) => ({
      date: p.date,
      value: p.value,
      projected: null,
    }));
    if (showProjection && hasProjection && base.length > 0) {
      base[base.length - 1]!.projected = base[base.length - 1]!.value;
      const boundary = base[base.length - 1]!.date;
      for (const p of series.projected) {
        if (p.date <= boundary) continue;
        base.push({ date: p.date, value: null, projected: p.value });
      }
    }
    return base;
  }, [observed, showProjection, hasProjection, series.projected]);

  const growth = useMemo(() => growthSummary(observed), [observed]);

  if (observed.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
        {observed.length === 0
          ? "Aún no hay historial para este rango."
          : "Necesitas al menos 2 puntos para graficar."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Crecimiento" value={formatCurrency(growth.absolute, currency)} />
          <Stat label="Variación" value={formatPercent(growth.totalPct)} />
          <Stat label="Anualizado (CAGR)" value={formatPercent(growth.cagr)} />
        </div>
        {hasProjection && (
          <Button
            size="sm"
            variant={showProjection ? "primary" : "secondary"}
            aria-pressed={showProjection}
            onClick={() => setShowProjection((v) => !v)}
            className="h-8 px-3"
          >
            Proyección
          </Button>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={yAxisTick}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted)" }}
              formatter={(v, name) => [
                formatCurrency(Number(v ?? 0), currency),
                name === "projected" ? "Proyección" : "Total",
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              connectNulls={false}
            />
            {showProjection && hasProjection && (
              <Area
                type="monotone"
                dataKey="projected"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#portfolioGradient)"
                fillOpacity={0.35}
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
