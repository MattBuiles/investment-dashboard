import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  fetchCdtRatesByTerm,
  fetchCdtRateHistory,
  cdtHistoryKey,
  nearestTerm,
  type RateHistoryByKey,
} from "@/lib/cdt-rates";
import { AddCdtToggle } from "./add-cdt-toggle";
import { CdtRow } from "./cdt-row";
import { MarketRatesSection } from "./market-rates";

export default async function CdtsPage() {
  const supabase = await createClient();
  const [{ data: cdts }, ratesByTerm] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("kind", "cdt")
      .order("maturity_date", { ascending: true }),
    fetchCdtRatesByTerm(),
  ]);

  // Tendencia histórica de tasa por banco+plazo, solo para los bancos que el
  // usuario realmente tiene (una petición por par único, cacheada 1h).
  const uniquePairs = new Map<string, { bank: string; termDesc: string }>();
  for (const c of cdts ?? []) {
    if (!c.institution) continue;
    const termDesc = nearestTerm(c.term_months).desc;
    uniquePairs.set(cdtHistoryKey(c.institution, termDesc), {
      bank: c.institution,
      termDesc,
    });
  }
  const historyEntries = await Promise.all(
    [...uniquePairs].map(
      async ([key, { bank, termDesc }]) =>
        [key, await fetchCdtRateHistory(bank, termDesc)] as const
    )
  );
  const rateHistory: RateHistoryByKey = Object.fromEntries(historyEntries);

  const total = (cdts ?? []).reduce((s, c) => s + Number(c.principal ?? 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (cdts ?? [])
    .filter((c) => c.maturity_date && c.maturity_date >= today)
    .sort((a, b) => (a.maturity_date! < b.maturity_date! ? -1 : 1))[0];

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">CDTs</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Certificados de depósito a término.
          </p>
        </div>
        <AddCdtToggle marketRatesByTerm={ratesByTerm} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">Total invertido</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {(cdts ?? []).length} CDT{(cdts ?? []).length === 1 ? "" : "s"}
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">Próximo vencimiento</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {upcoming?.maturity_date ?? "—"}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {upcoming?.name ?? "Sin CDTs activos"}
          </p>
        </GlassCard>
      </section>

      {!cdts || cdts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--muted)]">
              No tienes CDTs aún. Agrega uno arriba.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-2 pb-2 px-0">
            <ul className="divide-y divide-[var(--border)]">
              {cdts.map((c) => (
                <CdtRow
                  key={c.id}
                  marketRatesByTerm={ratesByTerm}
                  rateHistory={
                    c.institution
                      ? rateHistory[
                          cdtHistoryKey(
                            c.institution,
                            nearestTerm(c.term_months).desc
                          )
                        ]
                      : undefined
                  }
                  cdt={{
                    id: c.id,
                    name: c.name,
                    institution: c.institution,
                    currency: c.currency,
                    principal: c.principal,
                    interest_rate: c.interest_rate,
                    term_months: c.term_months,
                    start_date: c.start_date,
                    maturity_date: c.maturity_date,
                  }}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <MarketRatesSection ratesByTerm={ratesByTerm} />
    </div>
  );
}
