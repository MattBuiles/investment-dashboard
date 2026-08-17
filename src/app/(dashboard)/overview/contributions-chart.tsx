"use client";

import { useMemo } from "react";
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
import { formatCurrency } from "@/lib/utils";
import { sliceByDate, type Range } from "@/lib/history";
import type { ChartSeries } from "./portfolio-chart";
import { tooltipContentStyle, yAxisTick } from "./chart-utils";

type Row = { date: string; aportes: number; rendimiento: number };

/** Contributions (capital put in) vs return (accrued value − contributions).
 *  Contributions = principal-mode series; total value = accrued-mode series. */
export function ContributionsChart({
  accrued,
  principal,
  currency,
  range,
}: {
  accrued: ChartSeries;
  principal: ChartSeries;
  currency: string;
  range: Range;
}) {
  const rows = useMemo<Row[]>(() => {
    const pickSource = (s: ChartSeries) =>
      range === "1M" || range === "3M" ? s.recentDaily : s.fullWeekly;
    const acc = sliceByDate(pickSource(accrued), range);
    const prin = sliceByDate(pickSource(principal), range);
    const prinByDate = new Map(prin.map((p) => [p.date, p.value]));
    return acc.map((p) => {
      const aportes = prinByDate.get(p.date) ?? p.value;
      return {
        date: p.date,
        aportes,
        rendimiento: Math.max(p.value - aportes, 0),
      };
    });
  }, [accrued, principal, range]);

  if (rows.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
        Aún no hay historial para este rango.
      </div>
    );
  }

  const last = rows[rows.length - 1]!;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Aportado" value={formatCurrency(last.aportes, currency)} />
        <Stat label="Rendimiento" value={formatCurrency(last.rendimiento, currency)} />
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
              contentStyle={tooltipContentStyle}
              labelStyle={{ color: "var(--muted)" }}
              formatter={(v, name) => [
                formatCurrency(Number(v ?? 0), currency),
                name === "aportes" ? "Aportado" : "Rendimiento",
              ]}
            />
            <Area
              type="monotone"
              dataKey="aportes"
              stackId="1"
              stroke="var(--muted)"
              strokeWidth={1.5}
              fill="var(--muted)"
              fillOpacity={0.18}
            />
            <Area
              type="monotone"
              dataKey="rendimiento"
              stackId="1"
              stroke="var(--positive)"
              strokeWidth={1.5}
              fill="var(--positive)"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
