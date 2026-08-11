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
