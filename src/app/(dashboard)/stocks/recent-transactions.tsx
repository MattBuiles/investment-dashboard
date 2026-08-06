import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export type Transaction = {
  id: string;
  kind: string;
  symbol: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  currency: string;
  occurred_at: string;
};

const KIND_LABEL: Record<string, string> = {
  buy: "Compra",
  sell: "Venta",
  dividend: "Dividendo",
  interest: "Interés",
  fee: "Comisión",
  deposit: "Depósito",
  withdraw: "Retiro",
};

export function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (transactions.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Movimientos recientes</h2>
          <span className="text-xs text-[var(--muted)]">
            {transactions.length} de IBKR
          </span>
        </div>
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {transactions.map((t) => {
            const isSell = t.kind === "sell";
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className={`w-16 shrink-0 text-xs font-semibold ${
                    isSell ? "text-[var(--positive)]" : "text-[var(--muted)]"
                  }`}
                >
                  {KIND_LABEL[t.kind] ?? t.kind}
                </span>
                <span className="flex-1 truncate">
                  {t.symbol ?? "—"}
                  {t.quantity != null && (
                    <span className="text-[var(--muted)]">
                      {" "}
                      · {t.quantity} @ {t.price != null ? t.price.toFixed(2) : "—"}
                    </span>
                  )}
                </span>
                <span className="hidden sm:block text-xs text-[var(--muted)] tabular-nums">
                  {t.occurred_at.slice(0, 10)}
                </span>
                <span className="w-28 text-right font-medium tabular-nums">
                  {formatCurrency(t.amount, t.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
