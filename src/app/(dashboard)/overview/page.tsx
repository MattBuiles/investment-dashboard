import { GlassCard } from "@/components/ui/glass-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const placeholder = {
  totalValue: 48_750.32,
  todayPnL: 312.5,
  todayPnLPct: 0.0065,
  totalPnL: 6_240.18,
  totalPnLPct: 0.146,
  allocation: [
    { label: "Stocks (IBKR)", value: 32_100, color: "var(--accent)" },
    { label: "CDTs", value: 12_500, color: "var(--accent-2)" },
    { label: "Custom", value: 4_150, color: "var(--positive)" },
  ],
};

export default function OverviewPage() {
  const isPositiveToday = placeholder.todayPnL >= 0;
  const isPositiveTotal = placeholder.totalPnL >= 0;

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-8">
      <header>
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Overview
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">Total value</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {formatCurrency(placeholder.totalValue)}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Across all accounts
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">Today&apos;s P/L</p>
          <p
            className="mt-2 flex items-center gap-2 text-3xl font-semibold tabular-nums"
            style={{
              color: isPositiveToday ? "var(--positive)" : "var(--negative)",
            }}
          >
            {isPositiveToday ? (
              <ArrowUpRight className="size-7" />
            ) : (
              <ArrowDownRight className="size-7" />
            )}
            {formatCurrency(Math.abs(placeholder.todayPnL))}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)] tabular-nums">
            {formatPercent(placeholder.todayPnLPct)} since yesterday
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">All-time P/L</p>
          <p
            className="mt-2 text-3xl font-semibold tabular-nums"
            style={{
              color: isPositiveTotal ? "var(--positive)" : "var(--negative)",
            }}
          >
            {formatCurrency(placeholder.totalPnL)}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)] tabular-nums">
            {formatPercent(placeholder.totalPnLPct)} total return
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium text-[var(--muted)]">
              Performance
            </h2>
            <p className="mt-1 text-lg font-medium">
              Chart placeholder — Recharts line will go here once data wired.
            </p>
            <div className="mt-6 h-64 rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted)]">
              Recharts area chart
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium text-[var(--muted)]">
              Allocation
            </h2>
            <ul className="mt-4 space-y-3">
              {placeholder.allocation.map((a) => {
                const pct = a.value / placeholder.totalValue;
                return (
                  <li key={a.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: a.color }}
                        />
                        {a.label}
                      </span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {formatCurrency(a.value)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct * 100}%`,
                          background: a.color,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
