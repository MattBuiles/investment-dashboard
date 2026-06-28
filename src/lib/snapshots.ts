import type { SupabaseClient } from "@supabase/supabase-js";
import { accountValue, accountValueIn, type Account, type Holding } from "@/lib/portfolio";
import { fetchFxRates } from "@/lib/fx";

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

  const [accountsRes, holdingsRes, profileRes, fx] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", userId),
    supabase.from("holdings").select("*").eq("user_id", userId),
    supabase.from("profiles").select("base_currency").eq("id", userId).maybeSingle(),
    fetchFxRates(),
  ]);

  const accounts: Account[] = accountsRes.data ?? [];
  const holdings: Holding[] = holdingsRes.data ?? [];
  const baseCurrency = profileRes.data?.base_currency ?? "USD";

  if (accounts.length === 0) return;

  const perAccount = accounts.map((a) => ({
    user_id: userId,
    account_id: a.id,
    taken_on: today,
    total_value: accountValue(a, holdings),
    currency: a.currency,
  }));

  const totalInBase = accounts.reduce(
    (s, a) => s + accountValueIn(a, holdings, baseCurrency, fx),
    0
  );

  const rows = [
    ...perAccount,
    {
      user_id: userId,
      account_id: null as unknown as string,
      taken_on: today,
      total_value: totalInBase,
      currency: baseCurrency,
    },
  ];

  await supabase.from("snapshots").insert(rows);
}
