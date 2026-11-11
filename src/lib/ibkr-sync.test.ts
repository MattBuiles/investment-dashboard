import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./ibkr-flex", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./ibkr-flex")>()),
  fetchFlexStatement: vi.fn(),
}));

import { fetchFlexStatement } from "./ibkr-flex";
import {
  replaceHoldings,
  syncAllConnections,
  syncConnectionAsAdmin,
  type SyncableConnection,
} from "./ibkr-sync";

const conn: SyncableConnection = {
  id: "c1",
  account_id: "a1",
  flex_query_id: "q1",
  user_id: "u1",
};

const position = {
  symbol: "VOO",
  quantity: 2,
  avg_cost: 400,
  last_price: 410,
  currency: "USD",
  asset_class: "ETF",
  ibkr_contract_id: "123",
};

type RpcResult = { data: unknown; error: { message: string } | null };

// A minimal admin client: records every table/rpc call and fails the test if a
// holdings table call is made (replacement must go only through the atomic RPC).
function fakeAdmin(rpcs: Record<string, RpcResult>) {
  const updates: Array<Record<string, unknown>> = [];
  const rpc = vi.fn(async (name: string) => rpcs[name] ?? { data: null, error: null });
  const from = vi.fn((table: string) => {
    if (table === "holdings") throw new Error("holdings must not be touched directly");
    return {
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return { eq: async () => ({ error: null }) };
      },
    };
  });
  return { admin: { rpc, from } as never, rpc, updates };
}

beforeEach(() => {
  vi.mocked(fetchFlexStatement).mockReset();
});

describe("replaceHoldings", () => {
  it("calls the atomic RPC with the account and rows", async () => {
    const { admin, rpc } = fakeAdmin({ replace_holdings: { data: null, error: null } });
    const rows = [{ symbol: "VOO" }] as never;
    await replaceHoldings(admin, "a1", rows);
    expect(rpc).toHaveBeenCalledWith("replace_holdings", { p_account_id: "a1", p_rows: rows });
  });

  it("throws the database error so the caller can keep the old holdings", async () => {
    const { admin } = fakeAdmin({
      replace_holdings: { data: null, error: { message: "boom" } },
    });
    await expect(replaceHoldings(admin, "a1", [])).rejects.toThrow("boom");
  });
});

describe("syncConnectionAsAdmin", () => {
  it("replaces holdings only through the RPC and marks success", async () => {
    vi.mocked(fetchFlexStatement).mockResolvedValue({ positions: [position], trades: [] });
    const { admin, rpc, updates } = fakeAdmin({
      get_broker_secret_service: { data: "token", error: null },
      replace_holdings: { data: null, error: null },
    });

    const result = await syncConnectionAsAdmin(admin, conn);

    expect(result).toEqual({ connectionId: "c1", ok: true, count: 1 });
    const call = rpc.mock.calls.find((c) => c[0] === "replace_holdings");
    expect(call).toBeDefined();
    expect(updates.at(-1)).toMatchObject({ last_sync_status: "success", last_sync_error: null });
  });

  it("marks the error and does not report success when the replacement fails", async () => {
    vi.mocked(fetchFlexStatement).mockResolvedValue({ positions: [position], trades: [] });
    const { admin, updates } = fakeAdmin({
      get_broker_secret_service: { data: "token", error: null },
      replace_holdings: { data: null, error: { message: "insert failed" } },
    });

    const result = await syncConnectionAsAdmin(admin, conn);

    expect(result).toEqual({ connectionId: "c1", ok: false, error: "insert failed" });
    expect(updates.at(-1)).toMatchObject({
      last_sync_status: "error",
      last_sync_error: "insert failed",
    });
  });
});

describe("syncAllConnections", () => {
  it("skips the remaining connections once the time budget is spent", async () => {
    vi.mocked(fetchFlexStatement).mockResolvedValue({ positions: [position], trades: [] });
    const { admin } = fakeAdmin({
      get_broker_secret_service: { data: "token", error: null },
      replace_holdings: { data: null, error: null },
    });
    // start = 0, first check = 0 (runs), second check = 600 > budget 500 (skipped)
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(600);

    const results = await syncAllConnections(admin, [conn, { ...conn, id: "c2" }], 500, now);

    expect(results[0]).toMatchObject({ connectionId: "c1", ok: true });
    expect(results[1]).toMatchObject({ connectionId: "c2", ok: false });
    expect(fetchFlexStatement).toHaveBeenCalledTimes(1);
  });
});
