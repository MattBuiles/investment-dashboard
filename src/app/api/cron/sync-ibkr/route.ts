import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncConnectionAsAdmin, type SyncableConnection } from "@/lib/ibkr-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const results = [];
  for (const conn of (connections ?? []) as SyncableConnection[]) {
    results.push(await syncConnectionAsAdmin(admin, conn));
  }

  const synced = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    total: results.length,
    synced,
    failed: results.length - synced,
    results,
  });
}
