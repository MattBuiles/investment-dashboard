const DATASET_ID = "axk9-g2nh";
const ENDPOINT = `https://www.datos.gov.co/resource/${DATASET_ID}.json`;

export type CdtMarketRate = {
  bank: string;
  rate: number;
  cutoff_date: string;
};

type RawRow = {
  nombreentidad?: string;
  fechacorte?: string;
  tasa?: string;
  monto?: string;
};

function buildUrl(termDescription: string): string {
  const where = `descripcion='${termDescription}' AND nombre_unidad_de_captura='EMISIONES PUNTUALES Y RANGOS DE EMISION DE CDT'`;
  const params = new URLSearchParams({
    $where: where,
    $order: "fechacorte DESC, tasa DESC",
    $limit: "30",
  });
  return `${ENDPOINT}?${params.toString()}`;
}

export type CdtTerm = { months: number; desc: string; label: string };

// Plazos que expone la Superfinanciera en el dataset.
export const CDT_TERMS: CdtTerm[] = [
  { months: 3, desc: "A 90 DIAS", label: "90 días" },
  { months: 6, desc: "A 180 DIAS", label: "180 días" },
  { months: 12, desc: "A 360 DIAS", label: "360 días" },
];

// Bucket de mercado más cercano al plazo real del CDT (en meses).
export function nearestTerm(months: number | null | undefined): CdtTerm {
  if (!months) return CDT_TERMS[CDT_TERMS.length - 1];
  return CDT_TERMS.reduce((best, t) =>
    Math.abs(t.months - months) < Math.abs(best.months - months) ? t : best
  );
}

export type MarketStats = { top: number; avg: number; count: number };

export function marketStats(rates: CdtMarketRate[]): MarketStats | null {
  if (!rates.length) return null;
  const vals = rates.map((r) => r.rate);
  const top = Math.max(...vals);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return { top, avg, count: vals.length };
}

// Tasa de mercado para un banco concreto (match laxo por nombre).
export function rateForBank(
  rates: CdtMarketRate[],
  bank: string
): number | null {
  const norm = bank.trim().toLowerCase();
  if (!norm) return null;
  const hit = rates.find((r) => {
    const b = r.bank.toLowerCase();
    return b.includes(norm) || norm.includes(b);
  });
  return hit ? hit.rate : null;
}

export type RatesByTerm = Record<string, CdtMarketRate[]>;

// Todas las bandas de plazo en paralelo, keyed por `desc`.
export async function fetchCdtRatesByTerm(limit: number = 10): Promise<RatesByTerm> {
  const entries = await Promise.all(
    CDT_TERMS.map(
      async (t) => [t.desc, await fetchTopCdtRates(t.desc, limit)] as const
    )
  );
  return Object.fromEntries(entries);
}

export async function fetchTopCdtRates(
  termDescription: string = "A 360 DIAS",
  limit: number = 10
): Promise<CdtMarketRate[]> {
  try {
    const res = await fetch(buildUrl(termDescription), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as RawRow[];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const latestDate = rows[0].fechacorte ?? "";

    const sameDate = rows.filter((r) => r.fechacorte === latestDate);

    const seen = new Set<string>();
    const dedup: CdtMarketRate[] = [];
    for (const r of sameDate) {
      const bank = (r.nombreentidad ?? "").trim().replace(/^"|"$/g, "");
      if (!bank || seen.has(bank)) continue;
      const rate = Number(r.tasa);
      if (!Number.isFinite(rate)) continue;
      seen.add(bank);
      dedup.push({
        bank,
        rate,
        cutoff_date: latestDate.slice(0, 10),
      });
      if (dedup.length >= limit) break;
    }

    return dedup;
  } catch {
    return [];
  }
}
