import { afterEach, describe, expect, it, vi } from "vitest";
import { isBudgetOwner } from "./splitstream";

describe("isBudgetOwner", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("only the owner's email, regardless of case", () => {
    vi.stubEnv("OWNER_EMAIL", "Owner@Gmail.com");
    expect(isBudgetOwner("owner@gmail.com")).toBe(true);
    expect(isBudgetOwner("otro@gmail.com")).toBe(false);
    expect(isBudgetOwner(undefined)).toBe(false);
  });

  it("without OWNER_EMAIL nobody is the owner", () => {
    vi.stubEnv("OWNER_EMAIL", "");
    expect(isBudgetOwner("owner@gmail.com")).toBe(false);
  });
});
