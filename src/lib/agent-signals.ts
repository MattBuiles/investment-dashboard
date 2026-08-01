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
}

function origin(): string {
  const raw =
    process.env.NEXT_PUBLIC_MARKET_AGENT_URL ?? "http://localhost:3001";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3001";
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
