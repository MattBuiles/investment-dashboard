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
import { formatCurrency } from "@/lib/utils";
import { sliceByDate, type BreakdownPoint, type Range } from "@/lib/history";
import { CATEGORY, tooltipContentStyle, yAxisTick } from "./chart-utils";

export type BreakdownSeries = {
  recentDaily: BreakdownPoint[];
  fullWeekly: BreakdownPoint[];
};

export function CompositionChart({
  series,
  currency,
  range,
}: {
  series: BreakdownSeries;
  currency: string;
  range: Range;
}) {
  const source =
    range === "1M" || range === "3M" ? series.recentDaily : series.fullWeekly;
  const data = useMemo(() => sliceByDate(source, range), [source, range]);

  if (data.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
        Aún no hay historial para este rango.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
              CATEGORY[name as keyof typeof CATEGORY]?.label ?? String(name),
            ]}
          />
          {(["cdt", "brokerage", "custom"] as const).map((k) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={CATEGORY[k].color}
              strokeWidth={1.5}
              fill={CATEGORY[k].color}
              fillOpacity={0.28}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
