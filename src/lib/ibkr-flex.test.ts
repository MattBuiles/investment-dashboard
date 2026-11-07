import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FlexError,
  TRANSIENT_FLEX_CODES,
  fetchFlexStatement,
} from "./ibkr-flex";

const SEND_URL =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest";
const GET_URL =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement";

const SEND_OK = `<FlexStatementResponse><Status>Success</Status><ReferenceCode>987654</ReferenceCode><Url>https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService.GetStatement?v=3</Url></FlexStatementResponse>`;

const WARN_1019 = `<FlexStatementResponse><Status>Warn</Status><ErrorCode>1019</ErrorCode><ErrorMessage>Statement generation in progress</ErrorMessage></FlexStatementResponse>`;

const STATEMENT = `<FlexQueryResponse><FlexStatements count="1"><FlexStatement accountId="U1234567"><OpenPositions><OpenPosition symbol="AAPL" position="10" costBasisPrice="150.25" markPrice="190.5" currency="USD" assetCategory="STK" conid="265598"/></OpenPositions><Trades><Trade symbol="AAPL" tradeID="999001" tradeDate="20240115" quantity="-5" tradePrice="180" netCash="900" buySell="SELL" currency="USD"/></Trade></Trades></FlexStatement></FlexStatements></FlexQueryResponse>`;

function sendFail(code: string): string {
  return `<FlexStatementResponse><Status>Fail</Status><ErrorCode>${code}</ErrorCode><ErrorMessage>Error ${code}</ErrorMessage></FlexStatementResponse>`;
}

function ok(body: string): () => Response {
  return () => new Response(body, { status: 200 });
}

function httpError(status: number, headers?: Record<string, string>): () => Response {
  return () => new Response("boom", { status, headers });
}

// Cola por endpoint: cada llamada consume el siguiente handler. Una llamada
// extra responde 404 (no reintentable) para que el test falle rápido.
function stubFlexFetch(
  sendHandlers: Array<() => Response>,
  getHandlers: Array<() => Response>
) {
  const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith(SEND_URL)) {
      const handler = sendHandlers.shift();
      if (handler) return handler();
      return new Response("extra SendRequest call", { status: 404 });
    }
    if (url.startsWith(GET_URL)) {
      const handler = getHandlers.shift();
      if (handler) return handler();
      return new Response("extra GetStatement call", { status: 400 });
    }
    return new Response(`unexpected url: ${url}`, { status: 404 });
  });
  vi.stubGlobal("fetch", mockFetch);
  return mockFetch;
}

function countCalls(mockFetch: ReturnType<typeof stubFlexFetch>, prefix: string): number {
  return mockFetch.mock.calls.filter((call) => String(call[0]).startsWith(prefix)).length;
}

// Avanza los timers fake hasta que la promesa se resuelve (sin esperas reales).
async function settle<T>(promise: Promise<T>, maxTicks = 120): Promise<T> {
  let done = false;
  const track = promise.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    }
  );
  for (let i = 0; i < maxTicks && !done; i++) {
    await vi.advanceTimersByTimeAsync(1000);
  }
  await track;
  return promise;
}

async function catchError(promise: Promise<unknown>): Promise<FlexError> {
  try {
    await settle(promise);
  } catch (e) {
    return e as FlexError;
  }
  throw new Error("expected promise to reject");
}

describe("ibkr-flex", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("FlexError derives retryable from TRANSIENT_FLEX_CODES", () => {
    expect(TRANSIENT_FLEX_CODES.has("1019")).toBe(true);
    expect(new FlexError("1001", "boom").retryable).toBe(true);
    expect(new FlexError("1012", "boom").retryable).toBe(false);
    expect(new FlexError("1001", "boom", false).retryable).toBe(false);
    expect(new FlexError("1012", "boom", true).retryable).toBe(true);
    expect(new FlexError("1001", "boom").name).toBe("FlexError");
    expect(`${new FlexError("1001", "boom").code}: msg`).toBe("1001: msg");
  });

  it("uses the v3 ndcdyn endpoint for SendRequest and GetStatement", async () => {
    const mockFetch = stubFlexFetch([ok(SEND_OK)], [ok(STATEMENT)]);

    await settle(fetchFlexStatement("token", "1234"));

    const urls = mockFetch.mock.calls.map((call) => String(call[0]));
    expect(urls).toHaveLength(2);
    expect(urls[0].startsWith(SEND_URL)).toBe(true);
    expect(urls[0]).toContain("v=3");
    expect(urls[1].startsWith(GET_URL)).toBe(true);
    expect(urls[1]).toContain("v=3");
  });

  it("parses positions and trades from a FlexQueryResponse statement", async () => {
    stubFlexFetch([ok(SEND_OK)], [ok(STATEMENT)]);

    const data = await settle(fetchFlexStatement("token", "1234"));

    expect(data.positions).toEqual([
      {
        symbol: "AAPL",
        quantity: 10,
        avg_cost: 150.25,
        last_price: 190.5,
        currency: "USD",
        asset_class: "STK",
        ibkr_contract_id: "265598",
      },
    ]);
    expect(data.trades).toEqual([
      {
        trade_id: "999001",
        symbol: "AAPL",
        side: "sell",
        quantity: 5,
        price: 180,
        amount: 900,
        currency: "USD",
        occurred_at: "2024-01-15T00:00:00Z",
      },
    ]);
  });

  it("retries SendRequest on transient code 1001 then succeeds", async () => {
    const mockFetch = stubFlexFetch(
      [ok(sendFail("1001")), ok(sendFail("1001")), ok(SEND_OK)],
      [ok(STATEMENT)]
    );

    const data = await settle(fetchFlexStatement("token", "1234"));

    expect(data.positions).toHaveLength(1);
    expect(countCalls(mockFetch, SEND_URL)).toBe(3);
    expect(countCalls(mockFetch, GET_URL)).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("throws immediately on non-transient SendRequest code 1012", async () => {
    const mockFetch = stubFlexFetch([ok(sendFail("1012"))], []);

    const error = await catchError(fetchFlexStatement("token", "1234"));

    expect(error).toBeInstanceOf(FlexError);
    expect(error.code).toBe("1012");
    expect(error.retryable).toBe(false);
    expect(countCalls(mockFetch, SEND_URL)).toBe(1);
    expect(countCalls(mockFetch, GET_URL)).toBe(0);
  });

  it("polls GetStatement while code 1019 warns, then returns the statement", async () => {
    const mockFetch = stubFlexFetch([ok(SEND_OK)], [ok(WARN_1019), ok(STATEMENT)]);

    const data = await settle(fetchFlexStatement("token", "1234"));

    expect(data.positions).toHaveLength(1);
    expect(data.trades).toHaveLength(1);
    expect(countCalls(mockFetch, GET_URL)).toBe(2);
  });

  it("retries GetStatement on HTTP 500 then returns the statement", async () => {
    const mockFetch = stubFlexFetch(
      [ok(SEND_OK)],
      [httpError(500), httpError(500), ok(STATEMENT)]
    );

    const data = await settle(fetchFlexStatement("token", "1234"));

    expect(data.positions).toHaveLength(1);
    expect(countCalls(mockFetch, GET_URL)).toBe(3);
  });

  it("honors Retry-After (capped) instead of hanging on huge values", async () => {
    const mockFetch = stubFlexFetch(
      [ok(SEND_OK)],
      [httpError(500, { "Retry-After": "999" }), ok(STATEMENT)]
    );

    const data = await settle(fetchFlexStatement("token", "1234"));

    // Sin el tope de 5000 ms el sleep sería de 999 s y nunca terminaría.
    expect(data.positions).toHaveLength(1);
    expect(countCalls(mockFetch, GET_URL)).toBe(2);
  });

  it("does not retry other 4xx responses", async () => {
    const mockFetch = stubFlexFetch([ok(SEND_OK)], [httpError(404)]);

    const error = await catchError(fetchFlexStatement("token", "1234"));

    expect(error.code).toBe("HTTP_ERROR");
    expect(error.retryable).toBe(false);
    expect(countCalls(mockFetch, GET_URL)).toBe(1);
  });

  it("throws retryable FlexError 1001 after exhausting SendRequest attempts", async () => {
    const mockFetch = stubFlexFetch(
      [ok(sendFail("1001")), ok(sendFail("1001")), ok(sendFail("1001")), ok(sendFail("1001"))],
      []
    );

    const error = await catchError(fetchFlexStatement("token", "1234"));

    expect(error).toBeInstanceOf(FlexError);
    expect(error.code).toBe("1001");
    expect(error.retryable).toBe(true);
    expect(countCalls(mockFetch, SEND_URL)).toBe(4);
    expect(countCalls(mockFetch, GET_URL)).toBe(0);
  });
});
