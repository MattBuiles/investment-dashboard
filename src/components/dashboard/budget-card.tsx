import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";
import { SPLITSTREAM_URL } from "@/lib/splitstream";
import { formatCurrency } from "@/lib/utils";

const BUCKET_LABEL: Record<string, string> = {
  obligaciones: "Obligaciones",
  impuestos: "Impuestos",
  inversion: "Inversión",
  ipv: "Fondo IPV",
  variables: "Gastos variables",
  colchon: "Colchón",
};

/** Resumen de la quincena que escribe splitstream. RLS: solo devuelve la fila del usuario. */
export async function BudgetCard() {
  const supabase = await createClient();
  const { data } = await supabase.from("ss_budget").select("*").maybeSingle();
  if (!data) return null;

  const available = (data.available ?? {}) as Record<string, number>;
  const totalAvailable = Object.values(available).reduce((s, n) => s + n, 0);
  const cop = (n: number) => formatCurrency(n, "COP");

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Presupuesto</p>
          <p className="text-xs text-[var(--muted)]">
            {data.paycheck_date ? `Quincena del ${data.paycheck_date}` : "Sin pago detectado"} · desde splitstream
          </p>
        </div>
        <a href={SPLITSTREAM_URL} className="text-sm text-[var(--accent)] hover:underline">
          Abrir ↗
        </a>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-[var(--muted)]">Disponible en la quincena</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{cop(totalAvailable)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">Por enviar a IBKR (trimestre)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{cop(Number(data.etf_pending))}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">Renta fija por invertir</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{cop(Number(data.fixed_income_pending))}</p>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
        {Object.entries(available).map(([bucket, left]) => (
          <li key={bucket} className="flex justify-between gap-3">
            <span className="text-[var(--muted)]">{BUCKET_LABEL[bucket] ?? bucket}</span>
            <span className={`tabular-nums ${left < 0 ? "text-[var(--negative)]" : ""}`}>{cop(left)}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
