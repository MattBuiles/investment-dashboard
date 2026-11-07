import { XMLParser } from "fast-xml-parser";

const FLEX_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";
const FLEX_VERSION = "3";

// Transient IBKR codes that are worth retrying.
export const TRANSIENT_FLEX_CODES = new Set([
  "1001",
  "1004",
  "1005",
  "1006",
  "1007",
  "1008",
  "1009",
  "1018",
  "1019",
  "1021",
]);

const MAX_ATTEMPTS = 4;
const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 1500;
const BASE_BACKOFF_MS = 1000;
const JITTER_MS = 250;
const MAX_BACKOFF_MS = 5000;
const MAX_RETRY_AFTER_MS = 5000;

export type FlexPosition = {
  symbol: string;
  quantity: number;
  avg_cost: number;
  last_price: number | null;
  currency: string;
  asset_class: string | null;
  ibkr_contract_id: string | null;
};

export type FlexTrade = {
  trade_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  amount: number; // netCash (signed): negative for buys, positive for sells
  currency: string;
  occurred_at: string; // ISO
};

export type FlexStatementData = {
  positions: FlexPosition[];
  trades: FlexTrade[];
};

export class FlexError extends Error {
  code: string;
  retryable: boolean;
  constructor(code: string, message: string, retryable?: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable ?? TRANSIENT_FLEX_CODES.has(code);
    this.name = "FlexError";
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
  Trades?: {
    Trade?: TradeEl | TradeEl[];
  };
};

type TradeEl = {
  symbol?: string;
  tradeID?: string | number;
  tradeDate?: string | number;
  dateTime?: string;
  quantity?: string | number;
  tradePrice?: string | number;
  netCash?: string | number;
  buySell?: string;
  currency?: string;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff (1s, 2s, 4s...) with small jitter; a Retry-After
// header from IBKR is honored, capped at 5s.
function backoffDelay(attempt: number, retryAfterMs?: number | null): number {
  if (retryAfterMs != null) return Math.min(retryAfterMs, MAX_RETRY_AFTER_MS);
  const exponential = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  return Math.min(exponential, MAX_BACKOFF_MS) + Math.random() * JITTER_MS;
}

function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(header);
  if (Number.isNaN(dateMs)) return null;
  const delta = dateMs - Date.now();
  return delta > 0 ? delta : 0;
}

// GET with retries: network errors, HTTP 429 and 5xx are retried (up to
// `maxAttempts` in total); the rest of the 4xx fail right away.
async function fetchText(url: string, label: string, maxAttempts = MAX_ATTEMPTS): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { method: "GET", cache: "no-store" });
    } catch {
      if (attempt >= maxAttempts) {
        throw new FlexError("NETWORK_ERROR", `${label} failed: network error`, true);
      }
      await sleep(backoffDelay(attempt));
      continue;
    }

    if (res.ok) return await res.text();

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxAttempts) {
      throw new FlexError("HTTP_ERROR", `${label} failed: ${res.status}`, retryable);
    }
    await sleep(backoffDelay(attempt, parseRetryAfterMs(res.headers.get("Retry-After"))));
  }
  throw new FlexError("HTTP_ERROR", `${label} failed: exhausted`, true);
}

async function sendRequest(token: string, queryId: string): Promise<string> {
  const url = `${FLEX_BASE}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=${FLEX_VERSION}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const xml = await fetchText(url, "Send request", MAX_ATTEMPTS - attempt);
    const parsed = parser.parse(xml) as FlexQueryResponse;
    const r = parsed.FlexStatementResponse;
    if (!r) throw new FlexError("PARSE_ERROR", "Missing FlexStatementResponse");

    if (r.Status !== "Success") {
      const err = new FlexError(
        r.ErrorCode ?? "FLEX_ERROR",
        r.ErrorMessage ?? "Flex SendRequest failed"
      );
      // Only transient codes are retried; everything else fails right away.
      if (!err.retryable || attempt === MAX_ATTEMPTS - 1) throw err;
      await sleep(backoffDelay(attempt + 1));
      continue;
    }
    if (!r.ReferenceCode) throw new FlexError("NO_REFERENCE", "Missing ReferenceCode");
    return String(r.ReferenceCode);
  }
  throw new FlexError("FLEX_ERROR", "Flex SendRequest failed");
}

async function getStatement(token: string, referenceCode: string): Promise<string> {
  const url = `${FLEX_BASE}/GetStatement?q=${encodeURIComponent(referenceCode)}&t=${encodeURIComponent(token)}&v=${FLEX_VERSION}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const isLast = attempt === MAX_POLL_ATTEMPTS - 1;
    const xml = await fetchText(url, "Get statement", MAX_POLL_ATTEMPTS - attempt);

    if (xml.includes("FlexQueryResponse")) return xml;

    const parsed = parser.parse(xml) as FlexQueryResponse;
    const r = parsed.FlexStatementResponse;
    // 1019 = the statement is not ready yet: keep polling.
    if (r?.Status === "Warn" && r.ErrorCode === "1019") {
      if (!isLast) await sleep(POLL_INTERVAL_MS);
      continue;
    }
    if (r?.ErrorCode) {
      const err = new FlexError(r.ErrorCode, r.ErrorMessage ?? "Flex error");
      if (!err.retryable) throw err;
      if (!isLast) await sleep(backoffDelay(attempt + 1));
      continue;
    }

    throw new FlexError("UNKNOWN_RESPONSE", "Unexpected Flex response");
  }
  throw new FlexError("TIMEOUT", "Flex statement not ready after retries", true);
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

// Turns "20240115" or "20240115;103000" into ISO. Returns null if it does not parse.
function parseTradeDate(tradeDate?: string | number, dateTime?: string): string | null {
  const raw = String(tradeDate ?? dateTime ?? "").trim();
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T00:00:00Z`;
}

function parseTrades(xml: string): FlexTrade[] {
  const parsed = parser.parse(xml) as FlexQueryResponse;
  const statements = asArray(parsed.FlexQueryResponse?.FlexStatements?.FlexStatement);

  const trades: FlexTrade[] = [];
  for (const stmt of statements) {
    for (const t of asArray(stmt.Trades?.Trade)) {
      const tradeId = t.tradeID != null ? String(t.tradeID) : "";
      const symbol = t.symbol?.trim();
      const side = t.buySell?.toUpperCase();
      if (!tradeId || !symbol || (side !== "BUY" && side !== "SELL")) continue;

      const occurred_at = parseTradeDate(t.tradeDate, t.dateTime);
      if (!occurred_at) continue;

      const quantity = Math.abs(Number(t.quantity ?? 0));
      const price = Number(t.tradePrice ?? 0);
      const netCash = Number(t.netCash ?? 0);
      const amount = Number.isFinite(netCash) && netCash !== 0
        ? netCash
        : (side === "BUY" ? -1 : 1) * quantity * (Number.isFinite(price) ? price : 0);

      trades.push({
        trade_id: tradeId,
        symbol: symbol.toUpperCase(),
        side: side === "BUY" ? "buy" : "sell",
        quantity: Number.isFinite(quantity) ? quantity : 0,
        price: Number.isFinite(price) ? price : 0,
        amount: Number.isFinite(amount) ? amount : 0,
        currency: (t.currency ?? "USD").toUpperCase(),
        occurred_at,
      });
    }
  }
  return trades;
}

// A single SendRequest/GetStatement returns positions + trades (when the Flex
// query includes the Trades section; otherwise trades stays empty — no failure).
export async function fetchFlexStatement(
  token: string,
  queryId: string
): Promise<FlexStatementData> {
  const ref = await sendRequest(token, queryId);
  const xml = await getStatement(token, ref);
  return { positions: parsePositions(xml), trades: parseTrades(xml) };
}

export async function fetchFlexPositions(
  token: string,
  queryId: string
): Promise<FlexPosition[]> {
  const { positions } = await fetchFlexStatement(token, queryId);
  return positions;
}
