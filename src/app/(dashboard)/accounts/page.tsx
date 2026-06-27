import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AddAccountToggle } from "./add-account-toggle";
import { DeleteAccountButton } from "./account-list-actions";

const kindLabel: Record<string, string> = {
  cdt: "CDT",
  brokerage: "Brokerage",
  custom: "Custom",
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="px-6 py-8 md:px-10 md:py-12 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            CDTs and custom assets you track manually.
          </p>
        </div>
        <AddAccountToggle />
      </header>

      {(!accounts || accounts.length === 0) ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--muted)]">
              No accounts yet. Add a CDT or a custom asset above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-2 pb-2 px-0">
            <ul className="divide-y divide-[var(--border)]">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{a.name}</p>
                      <span className="text-xs rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted)]">
                        {kindLabel[a.kind] ?? a.kind}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-1 truncate">
                      {a.institution ?? "—"}
                      {a.kind === "cdt" && a.interest_rate != null && (
                        <> · {(a.interest_rate * 100).toFixed(2)}% · {a.term_months} mo</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {a.principal != null ? formatCurrency(a.principal, a.currency) : "—"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{a.currency}</p>
                  </div>
                  <DeleteAccountButton id={a.id} name={a.name} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
