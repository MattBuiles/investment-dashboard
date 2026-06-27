import { XMLParser } from "fast-xml-parser";

const FLEX_BASE = "https://gdcdyn.interactivebrokers.com/Universal/servlet";
const FLEX_VERSION = "3";

export type FlexPosition = {
  symbol: string;
  quantity: number;
  avg_cost: number;
  last_price: number | null;
  currency: string;
  asset_class: string | null;
  ibkr_contract_id: string | null;
};

export class FlexError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type SendResponse = {
  Status?: string;
  ReferenceCode?: string | number;
  Url?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
};

type FlexQueryResponse = {
  FlexQueryResponse?: {
    FlexStatements?: {
      FlexStatement?: FlexStatement | FlexStatement[];
    };
  };
  FlexStatementResponse?: SendResponse;
};

type FlexStatement = {
  OpenPositions?: {
    OpenPosition?: OpenPositionEl | OpenPositionEl[];
  };
};

type OpenPositionEl = {
  symbol?: string;
  position?: string | number;
  costBasisPrice?: string | number;
  costBasisMoney?: string | number;
  markPrice?: string | number;
  currency?: string;
  assetCategory?: string;
  conid?: string | number;
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

async function sendRequest(token: string, queryId: string): Promise<string> {
  const url = `${FLEX_BASE}/FlexStatementService.SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=${FLEX_VERSION}`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new FlexError("HTTP_ERROR", `Send request failed: ${res.status}`);

  const xml = await res.text();
  const parsed = parser.parse(xml) as FlexQueryResponse;
  const r = parsed.FlexStatementResponse;
  if (!r) throw new FlexError("PARSE_ERROR", "Missing FlexStatementResponse");

  if (r.Status !== "Success") {
    throw new FlexError(
      r.ErrorCode ?? "FLEX_ERROR",
      r.ErrorMessage ?? "Flex SendRequest failed"
    );
  }
  if (!r.ReferenceCode) throw new FlexError("NO_REFERENCE", "Missing ReferenceCode");
  return String(r.ReferenceCode);
}

async function getStatement(token: string, referenceCode: string): Promise<string> {
  const url = `${FLEX_BASE}/FlexStatementService.GetStatement?q=${encodeURIComponent(referenceCode)}&t=${encodeURIComponent(token)}&v=${FLEX_VERSION}`;

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new FlexError("HTTP_ERROR", `Get statement failed: ${res.status}`);
    const xml = await res.text();

    if (xml.includes("FlexQueryResponse")) return xml;

    const parsed = parser.parse(xml) as FlexQueryResponse;
    const r = parsed.FlexStatementResponse;
    if (r?.Status === "Warn" && r.ErrorCode === "1019") {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (r?.ErrorCode) throw new FlexError(r.ErrorCode, r.ErrorMessage ?? "Flex error");

    throw new FlexError("UNKNOWN_RESPONSE", "Unexpected Flex response");
  }
  throw new FlexError("TIMEOUT", "Flex statement not ready after retries");
}

function parsePositions(xml: string): FlexPosition[] {
  const parsed = parser.parse(xml) as FlexQueryResponse;
  const statements = asArray(parsed.FlexQueryResponse?.FlexStatements?.FlexStatement);

  const positions: FlexPosition[] = [];
  for (const stmt of statements) {
    const opens = asArray(stmt.OpenPositions?.OpenPosition);
    for (const p of opens) {
      const symbol = p.symbol?.trim();
      if (!symbol) continue;
      const quantity = Number(p.position ?? 0);
      if (!Number.isFinite(quantity) || quantity === 0) continue;

      const avg = Number(p.costBasisPrice ?? 0);
      const last = p.markPrice != null && p.markPrice !== "" ? Number(p.markPrice) : null;

      positions.push({
        symbol: symbol.toUpperCase(),
        quantity,
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

export async function fetchFlexPositions(
  token: string,
  queryId: string
): Promise<FlexPosition[]> {
  const ref = await sendRequest(token, queryId);
  const xml = await getStatement(token, ref);
  return parsePositions(xml);
}
