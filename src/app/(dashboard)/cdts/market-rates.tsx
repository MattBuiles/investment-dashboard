import { Card, CardContent } from "@/components/ui/card";
import { fetchTopCdtRates } from "@/lib/cdt-rates";

export async function MarketRatesSection() {
  const rates = await fetchTopCdtRates("A 360 DIAS", 10);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Mejores tasas CDT a 12 meses</h2>
          <span className="text-xs text-[var(--muted)]">
            {rates[0]
              ? `Superfinanciera · corte ${rates[0].cutoff_date}`
              : "Superfinanciera"}
          </span>
        </div>

        {rates.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            No se pudo obtener datos. Reintenta más tarde.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {rates.map((r, i) => (
              <li key={r.bank} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-6 text-right text-xs text-[var(--muted)] tabular-nums">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate">{r.bank}</span>
                <span className="font-semibold tabular-nums">
                  {r.rate.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-[var(--muted)]">
          Datos oficiales Superfinanciera de Colombia · datos.gov.co · cache 1h
        </p>
      </CardContent>
    </Card>
  );
}
