import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isBefore,
  max as dfMax,
  min as dfMin,
  parseISO,
  startOfDay,
  subMonths,
  subYears,
} from "date-fns";
import { convertAmount, type FxRates } from "./fx";
// Type-only imports keep this module free of a runtime cycle with portfolio.ts
// (portfolio.ts imports cdtValueAt from here at runtime).
import type { Account, Holding } from "./portfolio";
import type { Tables } from "@/types/database";

export type Transaction = Tables<"transactions">;

export type SeriesPoint = { date: string; value: number; projected?: boolean };
export type Range = "1M" | "3M" | "1Y" | "MAX";
export type Granularity = "daily" | "weekly";

export type ValueOpts = { accrued?: boolean };

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Real economic start of an account: the bank issue date, falling back to the
 *  platform record timestamp only when start_date is absent. */
export function accountStart(a: Account): Date {
  // Parse the calendar date only (date-only string, or the date part of a
  // created_at timestamp) so timezone offsets never shift the day.
  const src = a.start_date ?? a.created_at;
  return startOfDay(parseISO(src.slice(0, 10)));
}

/** YYYY-MM-DD in local time (timezone-safe, unlike toISOString). */
export function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function earliestStart(accounts: Account[]): Date {
  const starts = accounts.map(accountStart);
  return starts.length ? dfMin(starts) : startOfDay(new Date());
}

export function granularityFor(range: Range): Granularity {
  return range === "1M" || range === "3M" ? "daily" : "weekly";
}

export function rangeFrom(range: Range, to: Date, earliest: Date): Date {
  if (range === "MAX") return earliest;
  const back =
    range === "1M"
      ? subMonths(to, 1)
      : range === "3M"
        ? subMonths(to, 3)
        : subYears(to, 1);
  return dfMax([back, earliest]);
}

function buildAxis(from: Date, to: Date, granularity: Granularity): Date[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (isBefore(end, start)) return [end];
  const days = eachDayOfInterval({ start, end });
  if (granularity === "daily") return days;
  // weekly: every 7th day, always keeping the final endpoint
  const weekly = days.filter((_, i) => i % 7 === 0);
  const last = days[days.length - 1]!;
  if (weekly[weekly.length - 1]?.getTime() !== last.getTime()) weekly.push(last);
  return weekly;
}

// ---------------------------------------------------------------------------
// Per-account value at a point in time (in the account's own currency)
// ---------------------------------------------------------------------------

/** CDT value at `date` in the account currency.
 *  accrued=false → flat principal (from start). accrued=true → compounded at
 *  the effective-annual rate, capped at maturity (flat afterward). 0 before start. */
export function cdtValueAt(
  account: Account,
  date: Date,
  opts: ValueOpts = {}
): number {
  const P = Number(account.principal ?? 0);
  const start = accountStart(account);
  if (isBefore(date, start)) return 0;
  if (opts.accrued === false) return P;

  const r = Number(account.interest_rate ?? 0);
  if (!r) return P;

  let termYears = Infinity;
  if (account.term_months != null) {
    termYears = Number(account.term_months) / 12;
  } else if (account.maturity_date) {
    termYears = differenceInCalendarDays(parseISO(account.maturity_date), start) / 365;
  }

  const elapsedYears = Math.max(differenceInCalendarDays(date, start) / 365, 0);
  const accrualYears = Math.min(elapsedYears, termYears);
  return P * Math.pow(1 + r, accrualYears);
}

/** Inline of portfolio.holdingMarketValue to avoid a runtime import cycle. */
function holdingValue(h: Holding): number {
  return Number(h.quantity) * Number(h.last_price ?? h.avg_cost);
}

/** Brokerage value at `date` in the account currency.
 *  Reconstructs invested cost basis from transactions (net qty × avg_cost).
 *  When the account has no transactions, falls back to current market value
 *  held flat from the account start (an explicit approximation). */
function brokerageValueAt(
  account: Account,
  holdings: Holding[],
  transactions: Transaction[],
  date: Date
): number {
  const held = holdings.filter((h) => h.account_id === account.id);
  const accTxs = transactions.filter((t) => t.account_id === account.id);

  if (accTxs.length === 0) {
    if (isBefore(date, accountStart(account))) return 0;
    return held.reduce((s, h) => s + holdingValue(h), 0);
  }

  const bySymbol = new Map(held.map((h) => [h.symbol, h]));
  const netQty = new Map<string, number>();
  for (const t of accTxs) {
    if (!t.symbol || t.quantity == null) continue;
    if (isBefore(date, startOfDay(parseISO(t.occurred_at)))) continue;
    const q = Number(t.quantity);
    if (t.kind === "buy") netQty.set(t.symbol, (netQty.get(t.symbol) ?? 0) + q);
    else if (t.kind === "sell")
      netQty.set(t.symbol, (netQty.get(t.symbol) ?? 0) - q);
  }

  let value = 0;
  for (const [symbol, qty] of netQty) {
    if (qty <= 0) continue;
    const cost = Number(bySymbol.get(symbol)?.avg_cost ?? 0);
    value += qty * cost;
  }
  return value;
}

/** Account value at `date` in the account's own currency. */
export function accountValueAt(
  account: Account,
  holdings: Holding[],
  transactions: Transaction[],
  date: Date,
  opts: ValueOpts = {}
): number {
  if (account.kind === "cdt") return cdtValueAt(account, date, opts);
  if (account.kind === "brokerage")
    return brokerageValueAt(account, holdings, transactions, date);
  // custom
  if (isBefore(date, accountStart(account))) return 0;
  return Number(account.principal ?? 0);
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export type ReconstructOpts = {
  from: Date;
  to: Date;
  granularity: Granularity;
  baseCurrency: string;
  accrued?: boolean;
};

/** Historical portfolio value in base currency, sampled over [from, to]. */
export function reconstructSeries(
  accounts: Account[],
  holdings: Holding[],
  transactions: Transaction[],
  fx: FxRates,
  opts: ReconstructOpts
): SeriesPoint[] {
  const axis = buildAxis(opts.from, opts.to, opts.granularity);
  return axis.map((d) => {
    const value = accounts.reduce(
      (sum, a) =>
        sum +
        convertAmount(
          accountValueAt(a, holdings, transactions, d, { accrued: opts.accrued }),
          a.currency,
          opts.baseCurrency,
          fx
        ),
      0
    );
    return { date: toYMD(d), value };
  });
}

/** Total capital invested today (principal for cdt/custom, current MV for
 *  brokerage) in base currency — used to derive contribution pace. */
export function totalInvested(
  accounts: Account[],
  holdings: Holding[],
  transactions: Transaction[],
  fx: FxRates,
  at: Date,
  baseCurrency: string
): number {
  return accounts.reduce(
    (sum, a) =>
      sum +
      convertAmount(
        accountValueAt(a, holdings, transactions, at, { accrued: false }),
        a.currency,
        baseCurrency,
        fx
      ),
    0
  );
}

export type ProjectOpts = {
  from: Date;
  horizonMonths: number;
  baseCurrency: string;
  accrued?: boolean;
};

/** Forward projection: each account's value carried forward (CDTs accrue to
 *  maturity) plus new capital added at the historical average monthly pace.
 *  First point equals the current value so it connects to the observed curve. */
export function projectSeries(
  accounts: Account[],
  holdings: Holding[],
  transactions: Transaction[],
  fx: FxRates,
  opts: ProjectOpts
): SeriesPoint[] {
  const from = startOfDay(opts.from);
  const to = addMonths(from, opts.horizonMonths);
  const axis = buildAxis(from, to, "weekly");

  const earliest = earliestStart(accounts);
  const monthsActive = Math.max(1, differenceInCalendarDays(from, earliest) / 30);
  const invested = totalInvested(accounts, holdings, transactions, fx, from, opts.baseCurrency);
  const paceMonthly = invested / monthsActive;

  return axis.map((d) => {
    const carried = accounts.reduce(
      (sum, a) =>
        sum +
        convertAmount(
          accountValueAt(a, holdings, transactions, d, { accrued: opts.accrued }),
          a.currency,
          opts.baseCurrency,
          fx
        ),
      0
    );
    const monthsForward = Math.max(differenceInCalendarDays(d, from) / 30, 0);
    return {
      date: toYMD(d),
      value: carried + paceMonthly * monthsForward,
      projected: true,
    };
  });
}

// ---------------------------------------------------------------------------
// Growth summary
// ---------------------------------------------------------------------------

export type GrowthSummary = { absolute: number; totalPct: number; cagr: number };

export function growthSummary(series: SeriesPoint[]): GrowthSummary {
  if (series.length < 2) return { absolute: 0, totalPct: 0, cagr: 0 };
  const first = series[0]!.value;
  const last = series[series.length - 1]!.value;
  const absolute = last - first;
  const totalPct = first > 0 ? absolute / first : 0;

  const years =
    differenceInCalendarDays(
      parseISO(series[series.length - 1]!.date),
      parseISO(series[0]!.date)
    ) / 365;
  const cagr =
    first > 0 && years >= 0.08 ? Math.pow(last / first, 1 / years) - 1 : 0;

  return { absolute, totalPct, cagr };
}
