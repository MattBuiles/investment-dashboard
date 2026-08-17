import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import type { FxRates } from "./fx";
import type { Account, Holding } from "./portfolio";
import type { Transaction } from "./history";
import {
  accountStart,
  cdtValueAt,
  earliestStart,
  granularityFor,
  growthSummary,
  projectSeries,
  rangeFrom,
  reconstructBreakdown,
  reconstructSeries,
} from "./history";

const fx: FxRates = { base: "COP", rates: { USD: 1, COP: 4000 }, asOf: null };

function cdt(overrides: Partial<Account> = {}): Account {
  return {
    id: "a1",
    user_id: "u",
    name: "CDT",
    kind: "cdt",
    institution: "Bancolombia",
    currency: "COP",
    principal: 1_000_000,
    interest_rate: 0.1,
    term_months: 12,
    start_date: "2025-01-01",
    maturity_date: "2026-01-01",
    ibkr_account_id: null,
    metadata: {},
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as Account;
}

function custom(overrides: Partial<Account> = {}): Account {
  return cdt({
    id: "c1",
    kind: "custom",
    principal: 500_000,
    interest_rate: null,
    term_months: null,
    start_date: "2025-06-01",
    maturity_date: null,
    ...overrides,
  });
}

const noHoldings: Holding[] = [];
const noTxs: Transaction[] = [];

describe("cdtValueAt", () => {
  it("equals principal at the start date", () => {
    expect(cdtValueAt(cdt(), parseISO("2025-01-01"))).toBeCloseTo(1_000_000, 0);
  });

  it("compounds after one year, net of 4% retefuente on the interest", () => {
    // gross interest 100,000 → net 96,000 (retefuente 4%)
    expect(cdtValueAt(cdt(), parseISO("2026-01-01"))).toBeCloseTo(1_096_000, 0);
  });

  it("caps accrual at maturity (flat afterward), net of retefuente", () => {
    // term is 12 months, so two years out still = one year of accrual
    expect(cdtValueAt(cdt(), parseISO("2027-01-01"))).toBeCloseTo(1_096_000, 0);
  });

  it("honors a per-CDT retefuente override in metadata (0 = exento)", () => {
    const exento = cdt({ metadata: { retefuente_rate: 0 } });
    expect(cdtValueAt(exento, parseISO("2026-01-01"))).toBeCloseTo(1_100_000, 0);
    const alto = cdt({ metadata: { retefuente_rate: 0.1 } });
    // interest 100,000 → net 90,000
    expect(cdtValueAt(alto, parseISO("2026-01-01"))).toBeCloseTo(1_090_000, 0);
  });

  it("returns 0 before the start date", () => {
    expect(cdtValueAt(cdt(), parseISO("2024-06-01"))).toBe(0);
  });

  it("returns flat principal when accrued=false", () => {
    expect(cdtValueAt(cdt(), parseISO("2026-01-01"), { accrued: false })).toBe(
      1_000_000
    );
  });

  it("returns flat principal when interest_rate is null", () => {
    expect(cdtValueAt(cdt({ interest_rate: null }), parseISO("2026-01-01"))).toBe(
      1_000_000
    );
  });

  it("falls back to created_at when start_date is missing", () => {
    const a = cdt({ start_date: null, created_at: "2025-06-01T00:00:00Z" });
    expect(accountStart(a)).toEqual(parseISO("2025-06-01"));
    expect(cdtValueAt(a, parseISO("2025-05-01"))).toBe(0);
    expect(cdtValueAt(a, parseISO("2025-06-01"))).toBeCloseTo(1_000_000, 0);
  });
});

describe("reconstructSeries", () => {
  const accounts = [cdt(), custom()];

  it("daily axis length spans the interval inclusively", () => {
    const s = reconstructSeries(accounts, noHoldings, noTxs, fx, {
      from: parseISO("2025-01-01"),
      to: parseISO("2025-01-10"),
      granularity: "daily",
      baseCurrency: "COP",
    });
    expect(s).toHaveLength(10);
  });

  it("steps up on each account's real start date", () => {
    const s = reconstructSeries(accounts, noHoldings, noTxs, fx, {
      from: parseISO("2025-01-01"),
      to: parseISO("2025-12-31"),
      granularity: "daily",
      baseCurrency: "COP",
      accrued: false,
    });
    const at = (d: string) => s.find((p) => p.date === d)!.value;
    // before custom starts: only the CDT principal
    expect(at("2025-05-31")).toBeCloseTo(1_000_000, 0);
    // on/after custom start: CDT + custom principal
    expect(at("2025-06-01")).toBeCloseTo(1_500_000, 0);
  });

  it("sums accrued CDT value (net of retefuente) at the end of the window", () => {
    const s = reconstructSeries([cdt()], noHoldings, noTxs, fx, {
      from: parseISO("2025-01-01"),
      to: parseISO("2026-01-01"),
      granularity: "weekly",
      baseCurrency: "COP",
      accrued: true,
    });
    expect(s[s.length - 1]!.value).toBeCloseTo(1_096_000, 0);
  });
});

describe("reconstructBreakdown", () => {
  it("splits value by account category", () => {
    const s = reconstructBreakdown([cdt(), custom()], noHoldings, noTxs, fx, {
      from: parseISO("2025-06-01"),
      to: parseISO("2025-06-01"),
      granularity: "daily",
      baseCurrency: "COP",
      accrued: false,
    });
    const p = s[0]!;
    expect(p.cdt).toBeCloseTo(1_000_000, 0);
    expect(p.custom).toBeCloseTo(500_000, 0);
    expect(p.brokerage).toBe(0);
  });
});

describe("projectSeries", () => {
  it("flags all points projected, starts at current value, and grows by pace", () => {
    // flat CDT (rate 0) started a year before `from` → invested 1,000,000, pace ~83k/mo
    const a = cdt({ interest_rate: 0, start_date: "2024-01-01", term_months: null });
    const s = projectSeries([a], noHoldings, noTxs, fx, {
      from: parseISO("2025-01-01"),
      horizonMonths: 12,
      baseCurrency: "COP",
    });
    expect(s.every((p) => p.projected)).toBe(true);
    expect(s[0]!.value).toBeCloseTo(1_000_000, 0); // continuity with today
    // after 12 months at ~1M/12 per month → roughly doubles
    expect(s[s.length - 1]!.value).toBeGreaterThan(1_800_000);
  });
});

describe("growthSummary", () => {
  it("computes absolute, total % and CAGR over one year", () => {
    const g = growthSummary([
      { date: "2025-01-01", value: 100 },
      { date: "2026-01-01", value: 110 },
    ]);
    expect(g.absolute).toBeCloseTo(10, 5);
    expect(g.totalPct).toBeCloseTo(0.1, 5);
    expect(g.cagr).toBeCloseTo(0.1, 3);
  });

  it("is zero for <2 points", () => {
    expect(growthSummary([{ date: "2025-01-01", value: 100 }])).toEqual({
      absolute: 0,
      totalPct: 0,
      cagr: 0,
    });
  });
});

describe("range helpers", () => {
  it("granularityFor picks daily for short ranges, weekly for long", () => {
    expect(granularityFor("1M")).toBe("daily");
    expect(granularityFor("3M")).toBe("daily");
    expect(granularityFor("1Y")).toBe("weekly");
    expect(granularityFor("MAX")).toBe("weekly");
  });

  it("rangeFrom clamps to the earliest start and MAX uses it", () => {
    const to = parseISO("2026-01-01");
    const earliest = parseISO("2025-10-01");
    // 1Y back would be 2025-01-01 but earliest clamps it
    expect(rangeFrom("1Y", to, earliest)).toEqual(earliest);
    expect(rangeFrom("MAX", to, earliest)).toEqual(earliest);
    // 1M back is within range
    expect(rangeFrom("1M", to, earliest)).toEqual(parseISO("2025-12-01"));
  });

  it("earliestStart returns the minimum account start", () => {
    expect(earliestStart([cdt(), custom()])).toEqual(parseISO("2025-01-01"));
  });
});
