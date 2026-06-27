import Link from "next/link";
import { Landmark, LineChart, Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import {
  accountValue,
  type Account,
  type Holding,
} from "@/lib/portfolio";
import { takeDailySnapshot } from "@/lib/snapshots";
import { PortfolioChart } from "./portfolio-chart";

type CategoryKey = "cdt" | "brokerage" | "custom";

type CategoryCard = {
  key: CategoryKey;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  total: number;
  count: number;
  hint: string;
};

function nextMaturity(accounts: Account[]): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = accounts
    .filter((a) => a.kind === "cdt" && a.maturity_date)
    .map((a) => new Date(a.maturity_date as string))
    .filter((d) => d.getTime() >= today.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (!upcoming) return null;
  return upcoming.toISOString().slice(0, 10);
}

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [accountsRes, holdingsRes] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase.from("holdings").select("*"),
  ]);

  const accounts: Account[] = accountsRes.data ?? [];
  const holdings: Holding[] = holdingsRes.data ?? [];

  if (user) {
    await takeDailySnapshot(supabase, user.id);
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const { data: snapshotRows } = await supabase
    .from("snapshots")
    .select("taken_on, total_value")
    .is("account_id", null)
    .gte("taken_on", since.toISOString().slice(0, 10))
    .order("taken_on", { ascending: true });

  const chartData = (snapshotRows ?? []).map((s) => ({
    date: s.taken_on,
    value: Number(s.total_value),
  }));

  const byKind = (k: CategoryKey) => accounts.filter((a) => a.kind === k);

  const sumKind = (k: CategoryKey) =>
    byKind(k).reduce((s, a) => s + accountValue(a, holdings), 0);

  const cdtTotal = sumKind("cdt");
  const stockTotal = sumKind("brokerage");
  const customTotal = sumKind("custom");
  const grandTotal = cdtTotal + stockTotal + customTotal;

  const upcomingCdt = nextMaturity(accounts);

  const cards: CategoryCard[] = [
    {
      key: "cdt",
      title: "CDTs",
      href: "/cdts",
      icon: Landmark,
      accent: "var(--accent-2)",
      total: cdtTotal,
      count: byKind("cdt").length,
      hint: upcomingCdt ? `Next maturity ${upcomingCdt}` : "No active CDTs",
    },
    {
      key: "brokerage",
      title: "Stocks",
      href: "/stocks",
      icon: LineChart,
      accent: "var(--accent)",
      total: stockTotal,
      count: byKind("brokerage").reduce(
        (s, a) => s + holdings.filter((h) => h.account_id === a.id).length,
        0
      ),
      hint: byKind("brokerage").length === 0 ? "Connect IBKR or add manually" : "Across brokerages",
    },
    {
      key: "custom",
      title: "Custom",
      href: "/custom",
      icon: Sparkles,
      accent: "var(--positive)",
      total: customTotal,
      count: byKind("custom").length,
      hint: byKind("custom").length === 0 ? "Track anything: crypto, RE, etc." : "Custom holdings",
    },
  ];

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-10">
      <header>
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Overview</h1>
      </header>

      <GlassCard className="p-8">
        <p className="text-sm text-[var(--muted)]">Total portfolio value</p>
        <p className="mt-2 text-4xl font-semibold tabular-nums">
          {formatCurrency(grandTotal)}
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {accounts.length === 0
            ? "Start by adding a CDT, stock, or custom asset"
            : `Across ${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
        </p>
      </GlassCard>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const pct = grandTotal > 0 ? (c.total / grandTotal) * 100 : 0;
          return (
            <Link
              key={c.key}
              href={c.href}
              className="group block focus:outline-none"
            >
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
                  {formatCurrency(c.total)}
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
            <h2 className="text-sm font-medium text-[var(--muted)]">
              Evolución (90 días)
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {chartData.length} {chartData.length === 1 ? "punto" : "puntos"}
            </span>
          </div>
          <div className="mt-4">
            <PortfolioChart data={chartData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
