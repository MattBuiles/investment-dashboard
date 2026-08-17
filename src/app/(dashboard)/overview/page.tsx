import {
  differenceInCalendarDays,
  max as dfMax,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";
import {
  accountValueIn,
  accountValueInAccrued,
  holdingMarketValue,
  type Account,
  type Holding,
} from "@/lib/portfolio";
import {
  earliestStart,
  projectSeries,
  reconstructBreakdown,
  reconstructSeries,
  type Transaction,
} from "@/lib/history";
import { Snowflake } from "strata";
import { portfolioSnowflake } from "@/lib/agent-signals";
import { takeDailySnapshot } from "@/lib/snapshots";
import { fetchFxRates } from "@/lib/fx";
import { OverviewPanel } from "./overview-panel";
import type { ChartSeries } from "./portfolio-chart";
import { AgentSignalChip } from "@/components/agent-signal-chip";
import { marketAgentUrl, type AgentSignal } from "@/lib/agent-signals";

type CategoryKey = "cdt" | "brokerage" | "custom";

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

  const [accountsRes, holdingsRes, transactionsRes, profileRes, fx] =
    await Promise.all([
      supabase.from("accounts").select("*"),
      supabase.from("holdings").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("profiles").select("base_currency").maybeSingle(),
      fetchFxRates(),
    ]);

  const accounts: Account[] = accountsRes.data ?? [];
  const holdings: Holding[] = holdingsRes.data ?? [];
  const transactions: Transaction[] = transactionsRes.data ?? [];
  const baseCurrency = profileRes.data?.base_currency ?? "USD";

  // Señales de market-agent para tus posiciones (Supabase compartido).
  const heldSymbols = [...new Set(holdings.map((h) => h.symbol))];
  const agentSignalsRes = heldSymbols.length
    ? await supabase.from("ma_signals").select("*").in("ticker", heldSymbols)
    : { data: [] };
  const agentSignals = (agentSignalsRes.data ?? []) as AgentSignal[];
  const sigMap = Object.fromEntries(agentSignals.map((s) => [s.ticker, s]));
  const portfolioSnow = portfolioSnowflake(
    holdings.map((h) => ({ signal: sigMap[h.symbol], weight: holdingMarketValue(h) }))
  );

  if (user) {
    await takeDailySnapshot(supabase, user.id);
  }

  const byKind = (k: CategoryKey) => accounts.filter((a) => a.kind === k);
  const sumKind = (k: CategoryKey) =>
    byKind(k).reduce((s, a) => s + accountValueIn(a, holdings, baseCurrency, fx), 0);
  const sumKindAccrued = (k: CategoryKey) =>
    byKind(k).reduce(
      (s, a) => s + accountValueInAccrued(a, holdings, baseCurrency, fx),
      0
    );

  const cdtPrincipal = sumKind("cdt");
  const cdtAccrued = sumKindAccrued("cdt");
  const stockTotal = sumKind("brokerage");
  const customTotal = sumKind("custom");
  const grandPrincipal = cdtPrincipal + stockTotal + customTotal;
  const grandAccrued = cdtAccrued + stockTotal + customTotal;

  const stockCount = byKind("brokerage").reduce(
    (s, a) => s + holdings.filter((h) => h.account_id === a.id).length,
    0
  );
  const upcomingCdt = nextMaturity(accounts);

  // ---- Reconstructed value series (real start dates + accrual) ----
  const today = startOfDay(new Date());
  const earliest = earliestStart(accounts);
  const recentFrom = dfMax([earliest, subDays(today, 90)]);

  const maturities = accounts
    .filter((a) => a.kind === "cdt" && a.maturity_date)
    .map((a) => parseISO(a.maturity_date as string));
  const horizonMonths = maturities.length
    ? Math.max(12, Math.ceil(differenceInCalendarDays(dfMax(maturities), today) / 30))
    : 12;

  const buildSeries = (accrued: boolean): ChartSeries => ({
    recentDaily: reconstructSeries(accounts, holdings, transactions, fx, {
      from: recentFrom,
      to: today,
      granularity: "daily",
      baseCurrency,
      accrued,
    }),
    fullWeekly: reconstructSeries(accounts, holdings, transactions, fx, {
      from: earliest,
      to: today,
      granularity: "weekly",
      baseCurrency,
      accrued,
    }),
    projected: projectSeries(accounts, holdings, transactions, fx, {
      from: today,
      horizonMonths,
      baseCurrency,
      accrued,
    }),
  });

  const series = { accrued: buildSeries(true), principal: buildSeries(false) };

  const buildBreakdown = (accrued: boolean) => ({
    recentDaily: reconstructBreakdown(accounts, holdings, transactions, fx, {
      from: recentFrom,
      to: today,
      granularity: "daily" as const,
      baseCurrency,
      accrued,
    }),
    fullWeekly: reconstructBreakdown(accounts, holdings, transactions, fx, {
      from: earliest,
      to: today,
      granularity: "weekly" as const,
      baseCurrency,
      accrued,
    }),
  });

  const breakdown = {
    accrued: buildBreakdown(true),
    principal: buildBreakdown(false),
  };

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-10">
      <header>
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Overview</h1>
      </header>

      <OverviewPanel
        baseCurrency={baseCurrency}
        accountsCount={accounts.length}
        fxAsOf={fx.asOf}
        grandTotal={{ accrued: grandAccrued, principal: grandPrincipal }}
        cdt={{
          accrued: cdtAccrued,
          principal: cdtPrincipal,
          count: byKind("cdt").length,
          hint: upcomingCdt ? `Next maturity ${upcomingCdt}` : "No active CDTs",
        }}
        stock={{
          total: stockTotal,
          count: stockCount,
          hint:
            byKind("brokerage").length === 0
              ? "Connect IBKR or add manually"
              : "Across brokerages",
        }}
        custom={{
          total: customTotal,
          count: byKind("custom").length,
          hint:
            byKind("custom").length === 0
              ? "Track anything: crypto, RE, etc."
              : "Custom holdings",
        }}
        series={series}
        breakdown={breakdown}
      />

      {agentSignals.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Señales del agente</p>
              <p className="text-xs text-[var(--muted)]">
                Opinión de market-agent sobre tus posiciones
              </p>
            </div>
            <a
              href={marketAgentUrl("/")}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Ver Análisis ↗
            </a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex flex-1 flex-wrap gap-3">
              {agentSignals.map((s) => (
                <div key={s.ticker} className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.ticker}</span>
                  <AgentSignalChip symbol={s.ticker} signal={s} />
                </div>
              ))}
            </div>
            {portfolioSnow && (
              <div className="text-center">
                <Snowflake axes={portfolioSnow} size={140} />
                <p className="mt-1 text-xs text-[var(--muted)]">Snowflake de cartera</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
