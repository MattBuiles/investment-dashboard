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
