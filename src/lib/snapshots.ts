import type { SupabaseClient } from "@supabase/supabase-js";
import { accountValue, type Account, type Holding } from "@/lib/portfolio";

export async function takeDailySnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { count } = await supabase
    .from("snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("taken_on", today);

  if ((count ?? 0) > 0) return;

  const [accountsRes, holdingsRes] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", userId),
    supabase.from("holdings").select("*").eq("user_id", userId),
  ]);

  const accounts: Account[] = accountsRes.data ?? [];
  const holdings: Holding[] = holdingsRes.data ?? [];

  if (accounts.length === 0) return;

  const rows = accounts.map((a) => ({
    user_id: userId,
    account_id: a.id,
    taken_on: today,
    total_value: accountValue(a, holdings),
    currency: a.currency,
  }));

  const total = rows.reduce((s, r) => s + r.total_value, 0);
  rows.push({
    user_id: userId,
    account_id: null as unknown as string,
    taken_on: today,
    total_value: total,
    currency: accounts[0]?.currency ?? "USD",
  });

  await supabase.from("snapshots").insert(rows);
}

