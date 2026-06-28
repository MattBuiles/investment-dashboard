import type { Tables } from "@/types/database";
import { convertAmount, type FxRates } from "./fx";

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
