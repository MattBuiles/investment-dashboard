import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  fetchFlexStatement,
  FlexError,
  type FlexPosition,
  type FlexTrade,
} from "./ibkr-flex";

type Admin = SupabaseClient<Database>;

export type SyncableConnection = {
  id: string;
  account_id: string | null;
  flex_query_id: string | null;
  user_id: string;
  label?: string | null;
};

export type SyncResult =
  | { connectionId: string; ok: true; count: number }
  | { connectionId: string; ok: false; error: string };

// Map Flex positions to holdings rows. Shared by the manual (user-scoped) sync
// and the scheduled (service-role) sync so the two paths never drift.
export function holdingRowsFromPositions(
  positions: FlexPosition[],
  userId: string,
  accountId: string
) {
  const now = new Date().toISOString();
  return positions.map((p) => ({
    user_id: userId,
    account_id: accountId,
    symbol: p.symbol,
    quantity: p.quantity,
    avg_cost: p.avg_cost,
    currency: p.currency,
    last_price: p.last_price,
    last_price_at: p.last_price != null ? now : null,
    asset_class: p.asset_class,
    ibkr_contract_id: p.ibkr_contract_id,
  }));
}

export function transactionRowsFromTrades(
  trades: FlexTrade[],
  userId: string,
  accountId: string
) {
  return trades.map((t) => ({
    user_id: userId,
    account_id: accountId,
    kind: t.side, // "buy" | "sell"
    symbol: t.symbol,
    quantity: t.quantity,
    price: t.price,
    amount: t.amount,
    currency: t.currency,
    occurred_at: t.occurred_at,
    ibkr_execution_id: t.trade_id,
  }));
}

/**
 * Inserts only the new trades as transactions (dedup by ibkr_execution_id
 * already present on the account). Never deletes existing transactions. Returns
 * how many it inserted. Idempotent across syncs. Works with an admin or session client.
 */
export async function syncTradesToTransactions(
  client: Admin,
  trades: FlexTrade[],
  userId: string,
  accountId: string
): Promise<number> {
  if (trades.length === 0) return 0;

  const { data: existing } = await client
    .from("transactions")
    .select("ibkr_execution_id")
    .eq("account_id", accountId)
    .not("ibkr_execution_id", "is", null);

  const seen = new Set(
    (existing ?? []).map((r) => r.ibkr_execution_id).filter(Boolean)
  );
  const fresh = trades.filter((t) => !seen.has(t.trade_id));
  if (fresh.length === 0) return 0;

  const { error } = await client
    .from("transactions")
    .insert(transactionRowsFromTrades(fresh, userId, accountId));
  if (error) throw new Error(error.message);
  return fresh.length;
}

/**
 * Replaces an account's holdings atomically (migration 0011): one transaction,
 * so a failed insert leaves the previous holdings untouched instead of an empty
 * account. Works with an admin or a session client.
 */
export async function replaceHoldings(
  client: Admin,
  accountId: string,
  rows: ReturnType<typeof holdingRowsFromPositions>
): Promise<void> {
  const { error } = await client.rpc("replace_holdings", {
    p_account_id: accountId,
    p_rows: rows,
  });
  if (error) throw new Error(error.message);
}

function errorMessage(e: unknown): string {
  if (e instanceof FlexError) return `${e.code}: ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

async function markSync(
  admin: Admin,
  connectionId: string,
  status: "success" | "error",
  error: string | null
) {
  await admin
    .from("broker_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: status,
      last_sync_error: error,
    })
    .eq("id", connectionId);
}

/**
 * Sync one IBKR Flex connection using a service-role client (no user session).
 * Decrypts the Vault token via the service-only RPC, atomically replaces the
 * account's holdings, and records sync status. Never throws — returns a per-connection
 * result so the cron can process every connection independently.
 */
export async function syncConnectionAsAdmin(
  admin: Admin,
  conn: SyncableConnection
): Promise<SyncResult> {
  if (!conn.account_id || !conn.flex_query_id) {
    const error = "Connection missing brokerage account or Flex Query ID.";
    await markSync(admin, conn.id, "error", error);
    return { connectionId: conn.id, ok: false, error };
  }

  const { data: token, error: secretErr } = await admin.rpc(
    "get_broker_secret_service",
    { p_connection_id: conn.id }
  );
  if (secretErr || !token) {
    const error = secretErr?.message ?? "Could not read token.";
    await markSync(admin, conn.id, "error", error);
    return { connectionId: conn.id, ok: false, error };
  }

  try {
    const { positions, trades } = await fetchFlexStatement(token, conn.flex_query_id);

    await replaceHoldings(
      admin,
      conn.account_id,
      holdingRowsFromPositions(positions, conn.user_id, conn.account_id)
    );

    await syncTradesToTransactions(admin, trades, conn.user_id, conn.account_id);

    await markSync(admin, conn.id, "success", null);
    return { connectionId: conn.id, ok: true, count: positions.length };
  } catch (e) {
    const error = errorMessage(e);
    await markSync(admin, conn.id, "error", error);
    return { connectionId: conn.id, ok: false, error };
  }
}

/**
 * Syncs every connection one after another (IBKR rate-limits per token, so no
 * parallelism) inside a time budget: once it is spent, the remaining connections
 * are reported as skipped instead of letting the function be killed mid-sync.
 * A skipped connection keeps its previous status; the next run picks it up.
 */
export async function syncAllConnections(
  admin: Admin,
  connections: SyncableConnection[],
  budgetMs: number,
  now: () => number = Date.now
): Promise<SyncResult[]> {
  const startedAt = now();
  const results: SyncResult[] = [];
  for (const conn of connections) {
    if (now() - startedAt >= budgetMs) {
      results.push({
        connectionId: conn.id,
        ok: false,
        error: "Skipped: time budget exceeded, it will retry on the next run.",
      });
      continue;
    }
    results.push(await syncConnectionAsAdmin(admin, conn));
  }
  return results;
}
