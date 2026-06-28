type FxResponse = {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
};

export type FxRates = {
  base: string;
  rates: Record<string, number>;
  asOf: string | null;
};

const FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const FALLBACK: FxRates = {
  base: "USD",
  rates: { USD: 1 },
  asOf: null,
};

export async function fetchFxRates(): Promise<FxRates> {
  try {
    const res = await fetch(FX_ENDPOINT, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as FxResponse;
    if (data.result !== "success" || !data.rates) return FALLBACK;
    return {
      base: data.base_code ?? "USD",
      rates: data.rates,
      asOf: data.time_last_update_utc ?? null,
    };
  } catch {
    return FALLBACK;
  }
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  fx: FxRates
): number {
  if (!amount || !Number.isFinite(amount)) return 0;
  const fromU = from.toUpperCase();
  const toU = to.toUpperCase();
  if (fromU === toU) return amount;

  const fromRate = fx.rates[fromU];
  const toRate = fx.rates[toU];
  if (!fromRate || !toRate) return amount;

  const inUsd = amount / fromRate;
  return inUsd * toRate;
}
