import { describe, expect, it } from "vitest";
import { applyTierBonus, resolveDuplicateAcquisition, TIER_BONUS_PERCENT } from "../../src/simulation/tiering";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const DIRECT_ITEM = testItem({ id: "direct-item", name: "Direct Item", price: 4, timeModifier: -2 });
const BUFF_ITEM = testItem({
  id: "buff-item",
  name: "Buff Item",
  price: 6,
  timeModifier: 0,
  buff: { boostPercent: 10 },
});

describe("resolveDuplicateAcquisition (016-duplicate-item-tiering foundational, FR-002/FR-003)", () => {
  it("classifies as new when no held item matches", () => {
    const resolution = resolveDuplicateAcquisition(vehicleBuild(), DIRECT_ITEM);
    expect(resolution).toEqual({ kind: "new" });
  });

  it("classifies as tier-upgrade for a board match below tier 3", () => {
    const build = vehicleBuild([DIRECT_ITEM]);
    const resolution = resolveDuplicateAcquisition(build, DIRECT_ITEM);
    expect(resolution).toEqual({
      kind: "tier-upgrade",
      area: "vehicle",
      slotId: build.slots[0].slotId,
      fromTier: 1,
      toTier: 2,
    });
  });

  it("classifies as tier-upgrade for a storage match below tier 3", () => {
    const build = vehicleBuild([], [DIRECT_ITEM]);
    build.storage[0].tier = 2;
    const resolution = resolveDuplicateAcquisition(build, DIRECT_ITEM);
    expect(resolution).toEqual({
      kind: "tier-upgrade",
      area: "storage",
      index: 0,
      fromTier: 2,
      toTier: 3,
    });
  });

  it("classifies as max-tier-convert for a tier-3 match, with credits equal to half the price rounded down", () => {
    const build = vehicleBuild([DIRECT_ITEM]);
    build.slots[0].tier = 3;
    const resolution = resolveDuplicateAcquisition(build, DIRECT_ITEM);
    expect(resolution).toEqual({ kind: "max-tier-convert", creditsGained: Math.floor(DIRECT_ITEM.price / 2) });
  });

  it("is deterministic across repeated calls with the same build/item", () => {
    const build = vehicleBuild([DIRECT_ITEM]);
    expect(resolveDuplicateAcquisition(build, DIRECT_ITEM)).toEqual(resolveDuplicateAcquisition(build, DIRECT_ITEM));
  });
});

describe("applyTierBonus (016-duplicate-item-tiering foundational, FR-004)", () => {
  it("is a no-op at tier 1", () => {
    expect(applyTierBonus(DIRECT_ITEM, 1)).toEqual(DIRECT_ITEM);
  });

  it("scales a direct item's timeModifier at tier 2 and tier 3", () => {
    const tier2 = applyTierBonus(DIRECT_ITEM, 2);
    const tier3 = applyTierBonus(DIRECT_ITEM, 3);
    expect(tier2.timeModifier).toBeCloseTo(DIRECT_ITEM.timeModifier * (1 + TIER_BONUS_PERCENT / 100));
    expect(tier3.timeModifier).toBeCloseTo(DIRECT_ITEM.timeModifier * (1 + (TIER_BONUS_PERCENT * 2) / 100));
  });

  it("scales a buff item's boostPercent instead of timeModifier", () => {
    const tier2 = applyTierBonus(BUFF_ITEM, 2);
    expect(tier2.buff!.boostPercent).toBeCloseTo(BUFF_ITEM.buff!.boostPercent + TIER_BONUS_PERCENT);
    expect(tier2.timeModifier).toBe(BUFF_ITEM.timeModifier);
  });

  it("never mutates the input item", () => {
    const snapshot = structuredClone(DIRECT_ITEM);
    applyTierBonus(DIRECT_ITEM, 3);
    expect(DIRECT_ITEM).toEqual(snapshot);
  });
});

// 023-stat-targeted-amplifiers US5 (T036-T038): applyTierBonus also scales a
// held item's own physics/conditionalPhysics deltas, closing the same gap
// for duplicate-copy progression this feature closed for Buff/Synergy.
describe("applyTierBonus — physics/conditionalPhysics scaling (T036-T038, US5, contract §6)", () => {
  const PHYSICS_ITEM = testItem({
    id: "physics-item", name: "Physics Item", price: 4, timeModifier: 0,
    physics: { accelerationDelta: 10, topSpeedDelta: -4 },
  });
  const CONDITIONAL_ITEM = testItem({
    id: "conditional-item", name: "Conditional Item", price: 4, timeModifier: 0,
    conditionalPhysics: [{
      condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 60 },
      delta: { brakingPowerDelta: 8 },
    }],
  });

  it("T036: scales every present physics delta field by TIER_BONUS_PERCENT * (tier - 1)", () => {
    const tier2 = applyTierBonus(PHYSICS_ITEM, 2);
    const tier3 = applyTierBonus(PHYSICS_ITEM, 3);

    expect(tier2.physics!.accelerationDelta).toBeCloseTo(10 * (1 + TIER_BONUS_PERCENT / 100), 9);
    expect(tier2.physics!.topSpeedDelta).toBeCloseTo(-4 * (1 + TIER_BONUS_PERCENT / 100), 9);
    expect(tier3.physics!.accelerationDelta).toBeCloseTo(10 * (1 + (TIER_BONUS_PERCENT * 2) / 100), 9);
  });

  it("T036: is a no-op on physics at tier 1", () => {
    expect(applyTierBonus(PHYSICS_ITEM, 1).physics).toEqual(PHYSICS_ITEM.physics);
  });

  it("T037: scales every conditionalPhysics entry's delta field the same way", () => {
    const tier2 = applyTierBonus(CONDITIONAL_ITEM, 2);
    expect(tier2.conditionalPhysics![0].delta.brakingPowerDelta).toBeCloseTo(8 * (1 + TIER_BONUS_PERCENT / 100), 9);
    // The condition itself is untouched.
    expect(tier2.conditionalPhysics![0].condition).toEqual(CONDITIONAL_ITEM.conditionalPhysics![0].condition);
  });

  it("never mutates the input item's physics/conditionalPhysics", () => {
    const snapshot = structuredClone(PHYSICS_ITEM);
    applyTierBonus(PHYSICS_ITEM, 3);
    expect(PHYSICS_ITEM).toEqual(snapshot);
  });
});
