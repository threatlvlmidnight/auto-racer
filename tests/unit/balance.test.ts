import { describe, expect, it } from "vitest";
import {
  BALANCE_ENTRANTS,
  BALANCE_SEEDS,
  NELL_CATALOG,
  runBalanceHarness,
  STOCK_VEHICLE_BASELINE,
  representativeBalanceFixture,
} from "../fixtures/balance-fixtures";

describe("Feature 032 deterministic balance harness", () => {
  it("keeps Nell and the stock vehicle immutable controls", () => {
    expect(NELL_CATALOG.length).toBeGreaterThan(0);
    expect(STOCK_VEHICLE_BASELINE).toBeTruthy();
  });

  it("produces byte-identical representative fixtures and bounded spread", () => {
    const first = BALANCE_SEEDS.map(representativeBalanceFixture);
    const second = BALANCE_SEEDS.map(representativeBalanceFixture);
    expect(second).toEqual(first);
    const values = first.map((fixture) => fixture.draftItemIds.length);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(5);
  });

  it("passes the fixed representative-rate and optimized-ceiling gates", () => {
    const first = runBalanceHarness();
    const second = runBalanceHarness();
    expect(second).toEqual(first);
    expect(first.map((entry) => entry.entrantId)).toEqual(BALANCE_ENTRANTS);
    const representativeRates = first.map((entry) => entry.representativeRate);
    const ceilings = first.map((entry) => entry.optimizedCeilingSeconds);
    expect(Math.max(...representativeRates) - Math.min(...representativeRates)).toBeLessThanOrEqual(0.05);
    expect((Math.max(...ceilings) - Math.min(...ceilings)) / Math.min(...ceilings)).toBeLessThanOrEqual(0.02);
    expect(new Set(first.map((entry) => entry.baselineVehicleId))).toEqual(new Set([STOCK_VEHICLE_BASELINE.id]));
  });
});
