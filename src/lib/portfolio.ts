import type { Tables } from "@/types/database";
import { convertAmount, type FxRates } from "./fx";
import { cdtValueAt } from "./history";

export type Account = Tables<"accounts">;
export type Holding = Tables<"holdings">;

export type AllocationSlice = {
  label: string;
  value: number;
  color: string;
};

export function holdingMarketValue(h: Holding): number {
  const price = h.last_price ?? h.avg_cost;
  return Number(h.quantity) * Number(price);
}

/** Cost basis of a holding: what was spent (quantity × average cost). */
export function holdingCost(h: Holding): number {
  return Number(h.quantity) * Number(h.avg_cost);
}

export type Pnl = { cost: number; value: number; gain: number; gainPct: number };

/** Cost vs current value and the resulting gain/loss for a holding. */
export function holdingPnl(h: Holding): Pnl {
  const cost = holdingCost(h);
  const value = holdingMarketValue(h);
  const gain = value - cost;
  return { cost, value, gain, gainPct: cost > 0 ? gain / cost : 0 };
}

/** Aggregate P&L across a set of holdings (same currency assumed). */
export function holdingsPnl(holdings: Holding[]): Pnl {
  const cost = holdings.reduce((s, h) => s + holdingCost(h), 0);
  const value = holdings.reduce((s, h) => s + holdingMarketValue(h), 0);
  const gain = value - cost;
  return { cost, value, gain, gainPct: cost > 0 ? gain / cost : 0 };
}

export function accountValue(account: Account, holdings: Holding[]): number {
  if (account.kind === "brokerage") {
    return holdings
      .filter((h) => h.account_id === account.id)
      .reduce((sum, h) => sum + holdingMarketValue(h), 0);
  }
  return Number(account.principal ?? 0);
}

export function accountValueIn(
  account: Account,
  holdings: Holding[],
  toCurrency: string,
  fx: FxRates
): number {
  if (account.kind === "brokerage") {
    return holdings
      .filter((h) => h.account_id === account.id)
      .reduce(
        (sum, h) =>
          sum + convertAmount(holdingMarketValue(h), h.currency, toCurrency, fx),
        0
      );
  }
  return convertAmount(
    Number(account.principal ?? 0),
    account.currency,
    toCurrency,
    fx
  );
}

/** Like accountValue, but a CDT accrues interest to today instead of showing
 *  flat principal. Non-CDT accounts are unchanged. */
export function accountValueAccrued(
  account: Account,
  holdings: Holding[]
): number {
  if (account.kind === "cdt") {
    return cdtValueAt(account, new Date(), { accrued: true });
  }
  return accountValue(account, holdings);
}

/** Currency-converted variant of accountValueAccrued. */
export function accountValueInAccrued(
  account: Account,
  holdings: Holding[],
  toCurrency: string,
  fx: FxRates
): number {
  if (account.kind === "cdt") {
    return convertAmount(
      cdtValueAt(account, new Date(), { accrued: true }),
      account.currency,
      toCurrency,
      fx
    );
  }
  return accountValueIn(account, holdings, toCurrency, fx);
}

export function buildAllocation(
  accounts: Account[],
  holdings: Holding[]
): AllocationSlice[] {
  const buckets: Record<Account["kind"], number> = {
    brokerage: 0,
    cdt: 0,
    custom: 0,
  };

  for (const a of accounts) {
    buckets[a.kind] += accountValue(a, holdings);
  }

  return [
    { label: "Stocks (IBKR)", value: buckets.brokerage, color: "var(--accent)" },
    { label: "CDTs", value: buckets.cdt, color: "var(--accent-2)" },
    { label: "Custom", value: buckets.custom, color: "var(--positive)" },
  ].filter((s) => s.value > 0);
}

export function totalValue(slices: AllocationSlice[]): number {
  return slices.reduce((s, x) => s + x.value, 0);
}
