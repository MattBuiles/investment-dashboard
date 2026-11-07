import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "https://esm.sh/fast-xml-parser@5.0.9";

const FLEX_BASE = "https://gdcdyn.interactivebrokers.com/Universal/servlet";
const FLEX_VERSION = "3";

type Position = {
  symbol: string;
  quantity: number;
  avg_cost: number;
  last_price: number | null;
  currency: string;
  asset_class: string | null;
  ibkr_contract_id: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

async function fetchFlexPositions(token: string, queryId: string): Promise<Position[]> {
  const sendUrl = `${FLEX_BASE}/FlexStatementService.SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=${FLEX_VERSION}`;
  const sendRes = await fetch(sendUrl);
  if (!sendRes.ok) throw new Error(`Send failed: ${sendRes.status}`);
  const sendXml = await sendRes.text();
  const sendParsed: any = parser.parse(sendXml);
  const r = sendParsed.FlexStatementResponse;
  if (!r || r.Status !== "Success") {
    throw new Error(`Flex: ${r?.ErrorCode}: ${r?.ErrorMessage ?? "send failed"}`);
  }
  const ref = String(r.ReferenceCode);

  const getUrl = `${FLEX_BASE}/FlexStatementService.GetStatement?q=${encodeURIComponent(ref)}&t=${encodeURIComponent(token)}&v=${FLEX_VERSION}`;
  let xml = "";
  for (let i = 0; i < 6; i++) {
    const res = await fetch(getUrl);
    if (!res.ok) throw new Error(`Get failed: ${res.status}`);
    const body = await res.text();
    if (body.includes("FlexQueryResponse")) { xml = body; break; }
    const parsed: any = parser.parse(body);
    const rr = parsed.FlexStatementResponse;
    if (rr?.Status === "Warn" && rr.ErrorCode === "1019") {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      continue;
    }
    if (rr?.ErrorCode) throw new Error(`Flex: ${rr.ErrorCode}: ${rr.ErrorMessage ?? ""}`);
    throw new Error("Unexpected Flex response");
  }
  if (!xml) throw new Error("Flex timeout");

  const parsed: any = parser.parse(xml);
  const statements = asArray(parsed.FlexQueryResponse?.FlexStatements?.FlexStatement);
  const positions: Position[] = [];
  for (const stmt of statements) {
    const opens = asArray(stmt.OpenPositions?.OpenPosition);
    for (const p of opens) {
      const symbol = (p.symbol ?? "").trim();
      if (!symbol) continue;
      const qty = Number(p.position ?? 0);
      if (!qty) continue;
      const avg = Number(p.costBasisPrice ?? 0);
      const last = p.markPrice && p.markPrice !== "" ? Number(p.markPrice) : null;
      positions.push({
        symbol: symbol.toUpperCase(),
        quantity: qty,
        avg_cost: Number.isFinite(avg) ? avg : 0,
        last_price: last != null && Number.isFinite(last) ? last : null,
        currency: (p.currency ?? "USD").toUpperCase(),
        asset_class: p.assetCategory ?? null,
        ibkr_contract_id: p.conid != null ? String(p.conid) : null,
      });
    }
  }
  return positions;
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: connections, error } = await supabase
    .from("broker_connections")
    .select("id, user_id, account_id, flex_query_id")
    .eq("broker_kind", "ibkr_flex");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];
  for (const c of connections ?? []) {
    try {
      if (!c.account_id || !c.flex_query_id) {
        throw new Error("missing account_id or flex_query_id");
      }

      const { data: token, error: secErr } = await supabase.rpc(
        "cron_get_broker_secret",
        { p_connection_id: c.id }
      );
      if (secErr || !token) throw new Error(`secret fetch: ${secErr?.message ?? "empty"}`);

      const positions = await fetchFlexPositions(token as string, c.flex_query_id);

      await supabase.from("holdings").delete().eq("account_id", c.account_id);
      if (positions.length > 0) {
        const rows = positions.map((p) => ({
          user_id: c.user_id,
          account_id: c.account_id,
          symbol: p.symbol,
          quantity: p.quantity,
          avg_cost: p.avg_cost,
          currency: p.currency,
          last_price: p.last_price,
          last_price_at: p.last_price != null ? new Date().toISOString() : null,
          asset_class: p.asset_class,
          ibkr_contract_id: p.ibkr_contract_id,
        }));
        const { error: insErr } = await supabase.from("holdings").insert(rows);
        if (insErr) throw new Error(`holdings insert: ${insErr.message}`);
      }

      await supabase
        .from("broker_connections")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);

      results.push({ id: c.id, ok: true, count: positions.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      await supabase
        .from("broker_connections")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);
      results.push({ id: c.id, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
