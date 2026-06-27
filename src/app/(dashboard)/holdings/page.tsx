import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { holdingMarketValue } from "@/lib/portfolio";

export default async function HoldingsPage() {
  const supabase = await createClient();
  const { data: holdings } = await supabase
    .from("holdings")
    .select("*, accounts(name)")
    .order("symbol", { ascending: true });

  const rows = holdings ?? [];

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Holdings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Positions synced from Interactive Brokers.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--muted)]">
              No holdings yet. Connect IBKR in Settings to sync positions
              automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 pt-2 pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--muted)]">
                  <th className="px-6 py-3 font-medium">Symbol</th>
                  <th className="px-3 py-3 font-medium">Account</th>
                  <th className="px-3 py-3 font-medium text-right">Qty</th>
                  <th className="px-3 py-3 font-medium text-right">Avg cost</th>
                  <th className="px-3 py-3 font-medium text-right">Last</th>
                  <th className="px-6 py-3 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((h) => {
                  const acc = (h as { accounts?: { name: string } }).accounts;
                  return (
                    <tr key={h.id}>
                      <td className="px-6 py-3 font-medium">{h.symbol}</td>
                      <td className="px-3 py-3 text-[var(--muted)]">
                        {acc?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {Number(h.quantity).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatCurrency(Number(h.avg_cost), h.currency)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {h.last_price != null
                          ? formatCurrency(Number(h.last_price), h.currency)
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium">
                        {formatCurrency(holdingMarketValue(h), h.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
