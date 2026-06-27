import { GlassCard } from "@/components/ui/glass-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import {
  buildAllocation,
  totalValue,
  type Account,
  type Holding,
} from "@/lib/portfolio";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [accountsRes, holdingsRes] = await Promise.all([
    supabase.from("accounts").select("*"),
    supabase.from("holdings").select("*"),
  ]);

  const accounts: Account[] = accountsRes.data ?? [];
  const holdings: Holding[] = holdingsRes.data ?? [];

  const allocation = buildAllocation(accounts, holdings);
  const total = totalValue(allocation);
  const hasData = total > 0;

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-8">
      <header>
        <p className="text-sm text-[var(--muted)]">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Overview</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">Total value</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {accounts.length === 0
              ? "Add an account to get started"
              : `Across ${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">Today&apos;s P/L</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--muted)]">
            —
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Needs IBKR sync to compute
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm text-[var(--muted)]">All-time P/L</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--muted)]">
            —
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Needs snapshots history
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium text-[var(--muted)]">
              Performance
            </h2>
            <div className="mt-4 h-64 rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted)]">
              {hasData
                ? "Chart populates once daily snapshots accumulate"
                : "Add accounts to build performance history"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium text-[var(--muted)]">
              Allocation
            </h2>
            {allocation.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                No allocations yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {allocation.map((a) => {
                  const pct = a.value / total;
                  return (
                    <li key={a.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: a.color }}
                          />
                          {a.label}
                        </span>
                        <span className="tabular-nums text-[var(--muted)]">
                          {formatCurrency(a.value)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct * 100}%`,
                            background: a.color,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
