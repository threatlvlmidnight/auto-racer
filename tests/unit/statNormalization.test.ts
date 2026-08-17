import { describe, expect, it } from "vitest";
import {
  authoredTierOneCanonical,
  canonicalToPhysical,
  canonicalPoints,
  physicalDeltaFromCanonical,
  physicalStatsToCanonical,
  PHYSICAL_UNITS_PER_CANONICAL_POINT,
  marginalSpreadMultiplier,
  marginalSpreadExceedsTenPercent,
  referenceMarginals,
  resolveCanonicalContributions,
  tierScaledCanonical,
} from "../../src/simulation/statNormalization";
import { createItemInstance } from "../../src/simulation/itemInstances";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { resolvePhysicalStats, simulatePlayerLaps } from "../../src/simulation/laps";
import { generateTrack, STOCK_PHYSICAL_STATS } from "../../src/simulation/tracks";

function physicsItem(physics: ItemDefinition["physics"], conditionalPhysics?: ItemDefinition["conditionalPhysics"]): ItemDefinition {
  return testItem({
    id: "phys",
    name: "Phys",
    price: 1,
    timeModifier: 0,
    physics,
    conditionalPhysics,
  });
}

describe("canonicalPoints / authoredTierOneCanonical — one canonical scale (T012, FR-050)", () => {
  it("converts all four authored delta keys through a non-identity point scale", () => {
    const canonical = canonicalPoints({
      accelerationDelta: 2,
      topSpeedDelta: -1,
      brakingPowerDelta: 3,
      corneringSpeedDelta: 0,
    });
    expect(canonical).toEqual({
      acceleration: 2 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration,
      topSpeed: -1 / PHYSICAL_UNITS_PER_CANONICAL_POINT.topSpeed,
      brakingPower: 3 / PHYSICAL_UNITS_PER_CANONICAL_POINT.brakingPower,
      corneringSpeed: 0,
    });
    expect(Object.values(PHYSICAL_UNITS_PER_CANONICAL_POINT)).not.toContain(1);
  });

  it("round-trips a canonical point through the physical adapter within explicit floating tolerance", () => {
    const point = { acceleration: 1, topSpeed: 1, brakingPower: 1, corneringSpeed: 1 };
    const roundTrip = canonicalPoints(physicalDeltaFromCanonical(point));
    expect(roundTrip.acceleration).toBeCloseTo(point.acceleration, 12);
    expect(roundTrip.topSpeed).toBeCloseTo(point.topSpeed, 12);
    expect(roundTrip.brakingPower).toBeCloseTo(point.brakingPower, 12);
    expect(roundTrip.corneringSpeed).toBeCloseTo(point.corneringSpeed, 12);
  });

  it("routes stock, item, and setup contributions through the conversion boundary exactly once", () => {
    const item = physicsItem({ topSpeedDelta: PHYSICAL_UNITS_PER_CANONICAL_POINT.topSpeed });
    const resolved = resolvePhysicalStats([item], {});
    expect(physicalStatsToCanonical(resolved).topSpeed - physicalStatsToCanonical(STOCK_PHYSICAL_STATS).topSpeed).toBeCloseTo(1, 12);

    const setup = { brakingPowerDelta: PHYSICAL_UNITS_PER_CANONICAL_POINT.brakingPower };
    const lap = simulatePlayerLaps(vehicleBuild([item]), 1, generateTrack(7, 1), setup)[0];
    expect(lap.physics?.stats.brakingPower).toBeCloseTo(STOCK_PHYSICAL_STATS.brakingPower + setup.brakingPowerDelta, 12);
    expect(canonicalToPhysical(canonicalPoints(setup)).brakingPower).toBeCloseTo(setup.brakingPowerDelta, 12);
  });

  it("adds authored conditional deltas to direct physics", () => {
    const item = physicsItem(
      { accelerationDelta: 1, topSpeedDelta: 2 },
      [{ condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 40 }, delta: { corneringSpeedDelta: 5 } }],
    );
    expect(authoredTierOneCanonical(item)).toEqual({
      acceleration: 1 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration,
      topSpeed: 2 / PHYSICAL_UNITS_PER_CANONICAL_POINT.topSpeed,
      brakingPower: 0,
      corneringSpeed: 5 / PHYSICAL_UNITS_PER_CANONICAL_POINT.corneringSpeed,
    });
  });

  it("scales tiers uniformly with the Definition-based tier authority", () => {
    const item = physicsItem({ accelerationDelta: 10 });
    const tier1 = tierScaledCanonical(authoredTierOneCanonical(item), 1);
    const tier3 = tierScaledCanonical(authoredTierOneCanonical(item), 3);
    expect(tier1.acceleration).toBeCloseTo(10 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration);
    // +15% per tier above 1 → three layers bring tier-3 acceleration to 13.
    expect(tier3.acceleration).toBeCloseTo(13 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration);
  });
});

describe("resolveCanonicalContributions — separate contribution layers (T012, SC-011)", () => {
  it("reports base, tier, modification, and scrutineering layers independently", () => {
    const item = physicsItem({ accelerationDelta: 10 });
    const instance = {
      ...createItemInstance(item.id, "draft", 3),
      scrutineeringBonusPercent: 10,
    };
    const layers = resolveCanonicalContributions(instance, item, "fitted", { acceleration: 4, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 });
    const base = layers.find((layer) => layer.layer === "base");
    const tierLayer = layers.find((layer) => layer.layer === "tier");
    const modLayer = layers.find((layer) => layer.layer === "modification");
    const scrut = layers.find((layer) => layer.layer === "scrutineering");
    expect(base?.points).toBeCloseTo(10 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration);
    expect(tierLayer?.points).toBeCloseTo(3 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration);
    expect(modLayer?.points).toBeCloseTo(12); // 4 points × tier 3
    expect(scrut?.points).toBeCloseTo(1.3 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration); // 13 physical units × 0.10
  });

  it("omits zero layers so the ledger stays exact", () => {
    const item = physicsItem({ accelerationDelta: 5 });
    const instance = createItemInstance(item.id, "draft", 1);
    const layers = resolveCanonicalContributions(instance, item, "fitted", { acceleration: 0, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 });
    expect(layers).toHaveLength(1);
    expect(layers[0].layer).toBe("base");
  });
});

describe("calibrated marginal model — the 10% acceptance gate (T016, SC-013)", () => {
  it("reports all four reference-track marginal values", () => {
    const marginals = referenceMarginals();
    expect(marginals.map((entry) => entry.stat)).toEqual(["acceleration", "topSpeed", "brakingPower", "corneringSpeed"]);
  });

  it("keeps the strongest/weakest one-point spread within 10%", () => {
    const spread = marginalSpreadMultiplier();
    expect(spread).toBeLessThanOrEqual(1.1);
    expect(marginalSpreadExceedsTenPercent()).toBe(false);
  });
});
