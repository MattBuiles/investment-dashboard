// Shared, framework-agnostic chart helpers for the Overview charts.

export function yAxisTick(v: number): string {
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}k`
      : String(v);
}

export const tooltipContentStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

export const CATEGORY = {
  cdt: { label: "CDTs", color: "var(--accent-2)" },
  brokerage: { label: "Stocks", color: "var(--accent)" },
  custom: { label: "Custom", color: "var(--positive)" },
} as const;
