"use client";

import { useState } from "react";
import Link from "next/link";
import { Landmark, LineChart, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { PortfolioChart, type ChartSeries } from "./portfolio-chart";

type Mode = "accrued" | "principal";

type ModeValue = { accrued: number; principal: number };

export type OverviewPanelProps = {
  baseCurrency: string;
  accountsCount: number;
  fxAsOf: string | null;
  grandTotal: ModeValue;
  cdt: ModeValue & { count: number; hint: string };
  stock: { total: number; count: number; hint: string };
  custom: { total: number; count: number; hint: string };
  series: { accrued: ChartSeries; principal: ChartSeries };
};

export function OverviewPanel(props: OverviewPanelProps) {
  const [mode, setMode] = useState<Mode>("accrued");

  const grand = props.grandTotal[mode];
  const cards = [
    {
      key: "cdt",
      title: "CDTs",
      href: "/cdts",
      icon: Landmark,
      accent: "var(--accent-2)",
      total: props.cdt[mode],
      count: props.cdt.count,
      hint: props.cdt.hint,
    },
    {
      key: "brokerage",
      title: "Stocks",
      href: "/stocks",
      icon: LineChart,
      accent: "var(--accent)",
      total: props.stock.total,
      count: props.stock.count,
      hint: props.stock.hint,
    },
    {
      key: "custom",
      title: "Custom",
      href: "/custom",
      icon: Sparkles,
      accent: "var(--positive)",
      total: props.custom.total,
      count: props.custom.count,
      hint: props.custom.hint,
    },
  ];

  return (
    <div className="space-y-10">
      <GlassCard className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">
              Total portfolio value ({props.baseCurrency})
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums">
              {formatCurrency(grand, props.baseCurrency)}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {props.accountsCount === 0
                ? "Start by adding a CDT, stock, or custom asset"
                : `Across ${props.accountsCount} ${props.accountsCount === 1 ? "account" : "accounts"}${
                    props.fxAsOf ? ` · FX as of ${props.fxAsOf.slice(5, 16)}` : ""
                  }`}
            </p>
          </div>

          <div className="inline-flex rounded-full border border-[var(--border)] p-1">
            <Button
              size="sm"
              variant={mode === "accrued" ? "primary" : "ghost"}
              aria-pressed={mode === "accrued"}
              onClick={() => setMode("accrued")}
              className="h-8 px-3"
            >
              Con interés
            </Button>
            <Button
              size="sm"
              variant={mode === "principal" ? "primary" : "ghost"}
              aria-pressed={mode === "principal"}
              onClick={() => setMode("principal")}
              className="h-8 px-3"
            >
              Principal
            </Button>
          </div>
        </div>
      </GlassCard>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const pct = grand > 0 ? (c.total / grand) * 100 : 0;
          return (
            <Link key={c.key} href={c.href} className="group block focus:outline-none">
              <GlassCard className="p-6 transition-transform group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex size-10 items-center justify-center rounded-xl"
                    style={{ background: `color-mix(in oklab, ${c.accent} 18%, transparent)` }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <ArrowRight className="size-4 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
                </div>

                <p className="mt-5 text-sm text-[var(--muted)]">{c.title}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatCurrency(c.total, props.baseCurrency)}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>
                    {c.count} {c.count === 1 ? "item" : "items"}
                  </span>
                  <span className="tabular-nums">{pct.toFixed(1)}%</span>
                </div>

                <div className="mt-2 h-1 w-full rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: c.accent }}
                  />
                </div>

                <p className="mt-4 text-xs text-[var(--muted)]">{c.hint}</p>
              </GlassCard>
            </Link>
          );
        })}
      </section>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--muted)]">Evolución</h2>
            <span className="text-xs text-[var(--muted)]">
              {mode === "accrued" ? "con interés acumulado" : "principal (sin interés)"}
            </span>
          </div>
          <div className="mt-4">
            <PortfolioChart series={props.series[mode]} currency={props.baseCurrency} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
