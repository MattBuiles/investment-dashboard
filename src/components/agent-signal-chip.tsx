import { ArrowUpRight } from "lucide-react";
import {
  CLASSIFICATION_LABEL,
  classificationColor,
  marketAgentAssetUrl,
  type AgentSignal,
} from "@/lib/agent-signals";

// Chip con la opinión de market-agent para un símbolo + enlace al análisis.
export function AgentSignalChip({
  symbol,
  signal,
}: {
  symbol: string;
  signal?: AgentSignal;
}) {
  return (
    <a
      href={marketAgentAssetUrl(symbol)}
      target="_blank"
      rel="noopener noreferrer"
      title="Ver análisis en market-agent"
      className="group inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs transition-colors hover:border-[var(--accent)]"
    >
      {signal ? (
        <>
          {signal.score != null && (
            <span className="font-semibold tabular-nums">{signal.score}</span>
          )}
          {signal.classification && (
            <span className={classificationColor(signal.classification)}>
              {CLASSIFICATION_LABEL[signal.classification] ??
                signal.classification}
            </span>
          )}
          {signal.valuation_verdict &&
            signal.valuation_verdict !== "desconocido" && (
              <span
                className={
                  signal.valuation_verdict === "barato"
                    ? "text-emerald-600"
                    : signal.valuation_verdict === "caro"
                      ? "text-red-600"
                      : "text-[var(--muted)]"
                }
              >
                {signal.valuation_verdict}
              </span>
            )}
        </>
      ) : (
        <span className="text-[var(--muted)]">Analizar</span>
      )}
      <ArrowUpRight className="size-3 text-[var(--muted)] group-hover:text-[var(--accent)]" />
    </a>
  );
}
