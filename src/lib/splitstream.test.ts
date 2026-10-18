import { afterEach, describe, expect, it, vi } from "vitest";
import { isBudgetOwner } from "./splitstream";

describe("isBudgetOwner", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("solo el correo del dueño, sin importar mayúsculas", () => {
    vi.stubEnv("OWNER_EMAIL", "Owner@Gmail.com");
    expect(isBudgetOwner("owner@gmail.com")).toBe(true);
    expect(isBudgetOwner("otro@gmail.com")).toBe(false);
    expect(isBudgetOwner(undefined)).toBe(false);
  });

  it("sin OWNER_EMAIL nadie es dueño", () => {
    vi.stubEnv("OWNER_EMAIL", "");
    expect(isBudgetOwner("owner@gmail.com")).toBe(false);
  });
});
