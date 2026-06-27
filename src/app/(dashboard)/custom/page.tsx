import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AddCustomToggle } from "./add-custom-toggle";
import { CustomRow } from "./custom-row";

type Metadata = { notes?: string } | null;

export default async function CustomPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("accounts")
    .select("*")
    .eq("kind", "custom")
    .order("created_at", { ascending: false });

  const total = (items ?? []).reduce((s, i) => s + Number(i.principal ?? 0), 0);

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Custom</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Cripto, inmuebles, negocios, cualquier activo.
          </p>
        </div>
        <AddCustomToggle />
      </header>

      <GlassCard className="p-6">
        <p className="text-sm text-[var(--muted)]">Valor total</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          {formatCurrency(total)}
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {(items ?? []).length} activo{(items ?? []).length === 1 ? "" : "s"}
        </p>
      </GlassCard>

      {!items || items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--muted)]">
              Sin activos custom aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-2 pb-2 px-0">
            <ul className="divide-y divide-[var(--border)]">
              {items.map((it) => {
                const meta = it.metadata as Metadata;
                return (
                  <CustomRow
                    key={it.id}
                    item={{
                      id: it.id,
                      name: it.name,
                      institution: it.institution,
                      currency: it.currency,
                      principal: it.principal,
                      notes: meta?.notes,
                    }}
                  />
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
