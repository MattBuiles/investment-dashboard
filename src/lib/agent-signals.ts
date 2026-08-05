// Señales de market-agent (app hermana) leídas del Supabase compartido
// (tabla ma_signals). Permiten mostrar la opinión del agente junto a cada
// holding + enlazar al análisis completo.

export interface AgentSignal {
  ticker: string;
  name: string | null;
  score: number | null;
  classification: string | null;
  regime: string | null;
  valuation_verdict: string | null;
  upside_pct: number | null;
  snow_value: number | null;
  snow_future: number | null;
  snow_past: number | null;
  snow_health: number | null;
  snow_div: number | null;
  fair_value: number | null;
}

export interface SnowflakeAxis {
  label: string;
  value: number;
}

// Portfolio Snowflake: promedio de los 5 ejes ponderado por valor de cada
// holding. Solo cuentan los que tienen datos (acciones; los ETF no traen ejes).
// Devuelve null si ningún holding aporta.
export function portfolioSnowflake(
  weighted: { signal: AgentSignal | undefined; weight: number }[]
): SnowflakeAxis[] | null {
  const axes = ["snow_value", "snow_future", "snow_past", "snow_health", "snow_div"] as const;
  const labels = ["Value", "Future", "Past", "Health", "Div"];
  const sums = [0, 0, 0, 0, 0];
  let totalWeight = 0;
  for (const { signal, weight } of weighted) {
    if (!signal || signal.snow_value == null || weight <= 0) continue;
    totalWeight += weight;
    axes.forEach((k, i) => (sums[i] += (signal[k] ?? 0) * weight));
  }
  if (totalWeight === 0) return null;
  return labels.map((label, i) => ({ label, value: sums[i] / totalWeight }));
}

function origin(): string {
  const raw =
    process.env.NEXT_PUBLIC_MARKET_AGENT_URL ?? "https://market-agent-orcin.vercel.app";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://market-agent-orcin.vercel.app";
  }
}

export function marketAgentUrl(path = ""): string {
  return `${origin()}${path}`;
}

export function marketAgentAssetUrl(symbol: string): string {
  return `${origin()}/asset/${encodeURIComponent(symbol)}`;
}

export const CLASSIFICATION_LABEL: Record<string, string> = {
  comprar: "Comprar",
  comprar_parcial: "Comprar parcial",
  esperar: "Esperar",
  evitar: "Evitar",
};

export function classificationColor(c: string | null): string {
  switch (c) {
    case "comprar":
    case "comprar_parcial":
      return "text-emerald-600";
    case "esperar":
      return "text-amber-600";
    case "evitar":
      return "text-red-600";
    default:
      return "text-[var(--muted)]";
  }
}
