import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAllConnections, type SyncableConnection } from "@/lib/ibkr-sync";
import { syncOwnerPatrimonio } from "@/lib/notion-patrimonio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Stop starting new connections 60s before the function limit so the last
// sync (retries included) and the Notion step can still finish.
const SYNC_BUDGET_MS = 240_000;

/**
 * Scheduled IBKR Flex sync. Triggered by Vercel Cron (see vercel.json).
 *
 * Auth is fail-closed: if CRON_SECRET is unset, or the caller does not present
 * it, the route refuses to run. Vercel Cron sends `Authorization: Bearer
 * <CRON_SECRET>` automatically when the env var is set on the project.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: connections, error } = await admin
    .from("broker_connections")
    .select("id, account_id, flex_query_id, user_id, label")
    .eq("broker_kind", "ibkr_flex");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = await syncAllConnections(
    admin,
    (connections ?? []) as SyncableConnection[],
    SYNC_BUDGET_MS
  );

  const synced = results.filter((r) => r.ok).length;

  // Runs after the IBKR sync so prices stay fresh. A Notion failure does not take the cron down.
  let notion: string;
  try {
    notion = await syncOwnerPatrimonio(admin);
  } catch (e) {
    notion = e instanceof Error ? e.message : "error";
  }

  return NextResponse.json({
    ok: true,
    total: results.length,
    synced,
    failed: results.length - synced,
    results,
    notion,
  });
}
