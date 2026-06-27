import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  holdingMarketValue,
  type Account,
  type Holding,
} from "@/lib/portfolio";
import { AddBrokerToggle } from "./add-broker-toggle";
import { BrokerSection } from "./broker-section";
import { IbkrConnectionCard } from "./ibkr-connection-card";

export default async function StocksPage() {
  const supabase = await createClient();
  const [brokersRes, holdingsRes, connectionRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("kind", "brokerage")
      .order("created_at", { ascending: false }),
    supabase.from("holdings").select("*"),
    supabase
      .from("broker_connections")
      .select(
        "id, label, flex_query_id, last_synced_at, last_sync_status, last_sync_error, token_expires_at"
      )
      .eq("broker_kind", "ibkr_flex")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const brokers: Account[] = brokersRes.data ?? [];
  const holdings: Holding[] = holdingsRes.data ?? [];
  const connection = connectionRes.data ?? null;

  const total = holdings
    .filter((h) => brokers.some((b) => b.id === h.account_id))
    .reduce((s, h) => s + holdingMarketValue(h), 0);

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Stocks</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Posiciones por broker. IBKR sync próximamente.
          </p>
        </div>
        <AddBrokerToggle />
      </header>

      <IbkrConnectionCard connection={connection} />

      <GlassCard className="p-6">
        <p className="text-sm text-[var(--muted)]">Valor total</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          {formatCurrency(total)}
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {brokers.length} broker{brokers.length === 1 ? "" : "s"} · {holdings.filter((h) => brokers.some((b) => b.id === h.account_id)).length} posiciones
        </p>
      </GlassCard>

      {brokers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--muted)]">
              Agrega un broker arriba para empezar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {brokers.map((b) => (
            <BrokerSection
              key={b.id}
              broker={{
                id: b.id,
                name: b.name,
                institution: b.institution,
                currency: b.currency,
              }}
              holdings={holdings.filter((h) => h.account_id === b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
