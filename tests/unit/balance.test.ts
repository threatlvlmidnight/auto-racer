import { describe, expect, it } from "vitest";
import type { CanonicalStatTarget } from "../../src/simulation/types";
import {
  BALANCE_ENTRANTS,
  BALANCE_SEEDS,
  MARGINAL_VALUE_CORPUS,
  NELL_CATALOG,
  runBalanceHarness,
  STOCK_VEHICLE_BASELINE,
  representativeBalanceFixture,
} from "../fixtures/balance-fixtures";
import {
  marginalSpreadExceedsTenPercent,
  marginalSpreadMultiplier,
  REFERENCE_MARGINAL_SECONDS_PER_POINT,
} from "../../src/simulation/statNormalization";

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

describe("Feature 034 balanced reference-track 10% acceptance gate (T016, SC-013)", () => {
  it("keeps the one-point marginal stat spread within 10%", () => {
    const spread = marginalSpreadMultiplier();
    expect(spread).toBeGreaterThan(0);
    expect(spread).toBeLessThanOrEqual(1.1);
    expect(marginalSpreadExceedsTenPercent()).toBe(false);
  });
});

describe("Feature 034 four-stat marginal-value corpus snapshot (T003)", () => {
  it("pins the four canonical one-point marginal values", () => {
    const targets: CanonicalStatTarget[] = ["acceleration", "topSpeed", "brakingPower", "corneringSpeed"];
    targets.forEach((stat) => {
      expect(typeof MARGINAL_VALUE_CORPUS[stat]).toBe("number");
      expect(MARGINAL_VALUE_CORPUS[stat]).toBeGreaterThan(0);
      expect(MARGINAL_VALUE_CORPUS[stat]).toBe(REFERENCE_MARGINAL_SECONDS_PER_POINT[stat]);
    });
  });

  it("keeps the corpus internally consistent with the live calibration", () => {
    expect(Object.keys(MARGINAL_VALUE_CORPUS).sort()).toEqual(["acceleration", "brakingPower", "corneringSpeed", "topSpeed"]);
  });
});

