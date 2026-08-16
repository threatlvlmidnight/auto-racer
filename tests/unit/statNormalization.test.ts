import { describe, expect, it } from "vitest";
import {
  authoredTierOneCanonical,
  canonicalPoints,
  marginalSpreadMultiplier,
  marginalSpreadExceedsTenPercent,
  referenceMarginals,
  resolveCanonicalContributions,
  tierScaledCanonical,
} from "../../src/simulation/statNormalization";
import { createItemInstance } from "../../src/simulation/itemInstances";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";

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
  it("maps the four authored delta keys onto canonical points", () => {
    const canonical = canonicalPoints({
      accelerationDelta: 2,
      topSpeedDelta: -1,
      brakingPowerDelta: 3,
      corneringSpeedDelta: 0,
    });
    expect(canonical).toEqual({ acceleration: 2, topSpeed: -1, brakingPower: 3, corneringSpeed: 0 });
  });

  it("adds authored conditional deltas to direct physics", () => {
    const item = physicsItem(
      { accelerationDelta: 1, topSpeedDelta: 2 },
      [{ condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 40 }, delta: { corneringSpeedDelta: 5 } }],
    );
    expect(authoredTierOneCanonical(item)).toEqual({ acceleration: 1, topSpeed: 2, brakingPower: 0, corneringSpeed: 5 });
  });

  it("scales tiers uniformly with the Definition-based tier authority", () => {
    const item = physicsItem({ accelerationDelta: 10 });
    const tier1 = tierScaledCanonical(authoredTierOneCanonical(item), 1);
    const tier3 = tierScaledCanonical(authoredTierOneCanonical(item), 3);
    expect(tier1.acceleration).toBe(10);
    // +15% per tier above 1 → three layers bring tier-3 acceleration to 13.
    expect(tier3.acceleration).toBeCloseTo(13);
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
    expect(base?.points).toBeCloseTo(10);
    expect(tierLayer?.points).toBeCloseTo(3);
    expect(modLayer?.points).toBeCloseTo(12); // 4 points × tier 3
    expect(scrut?.points).toBeCloseTo(1.3); // 13 × 0.10
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
