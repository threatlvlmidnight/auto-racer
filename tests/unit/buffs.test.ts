import { describe, expect, it } from "vitest";
import {
  computeBoostsForLap,
  isCountSynergyBuff,
  matchingDirectItemCount,
} from "../../src/simulation/buffs";
import type { OfferedItem } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";

const DIRECT_ITEM: OfferedItem = testItem({
  id: "direct",
  name: "Direct Item",
  price: 2,
  timeModifier: -4,
  identityTag: "performance",
  cooldown: 1,
});

const FLAT_BUFF: OfferedItem = testItem({
  id: "flat-buff",
  name: "Flat Buff",
  price: 2,
  timeModifier: 0,
  identityTag: "performance",
  buff: { boostPercent: 5 },
});

const STACKING_BUFF: OfferedItem = testItem({
  id: "stacking-buff",
  name: "Stacking Buff",
  price: 2,
  timeModifier: 0,
  identityTag: "performance",
  cooldown: 3,
  buff: { boostPercent: 2 },
});

const COUNT_BUFF: OfferedItem = testItem({
  id: "count-buff",
  name: "Count Buff",
  price: 2,
  timeModifier: 0,
  identityTag: "performance",
  buff: { boostPercent: 3, perCount: true },
});

describe("isCountSynergyBuff", () => {
  it("is true only for a buff item with perCount set", () => {
    expect(isCountSynergyBuff(COUNT_BUFF)).toBe(true);
    expect(isCountSynergyBuff(FLAT_BUFF)).toBe(false);
    expect(isCountSynergyBuff(STACKING_BUFF)).toBe(false);
    expect(isCountSynergyBuff(DIRECT_ITEM)).toBe(false);
  });
});

describe("matchingDirectItemCount", () => {
  it("excludes the item itself", () => {
    expect(matchingDirectItemCount([COUNT_BUFF], COUNT_BUFF)).toBe(0);
  });

  it("excludes other buffs, even matching-tag ones", () => {
    expect(matchingDirectItemCount([COUNT_BUFF, FLAT_BUFF, STACKING_BUFF], COUNT_BUFF)).toBe(0);
  });

  it("excludes non-matching tags", () => {
    const other: OfferedItem = testItem({ id: "neutral", name: "Neutral", price: 2, timeModifier: -1 });
    expect(matchingDirectItemCount([COUNT_BUFF, other], COUNT_BUFF)).toBe(0);
  });

  it("counts duplicate-id direct items individually", () => {
    const copyA = { ...DIRECT_ITEM };
    const copyB = { ...DIRECT_ITEM };
    expect(matchingDirectItemCount([COUNT_BUFF, copyA, copyB], COUNT_BUFF)).toBe(2);
  });

  it("is order-independent and does not mutate its inputs", () => {
    const items = [DIRECT_ITEM, COUNT_BUFF, { ...DIRECT_ITEM, id: "direct-2" }];
    const snapshot = structuredClone(items);

    expect(matchingDirectItemCount(items, COUNT_BUFF)).toBe(2);
    expect(matchingDirectItemCount([...items].reverse(), COUNT_BUFF)).toBe(2);
    expect(items).toEqual(snapshot);
  });
});

describe("computeBoostsForLap", () => {
  it("keeps a flat buff constant from the first through final lap", () => {
    const items = [FLAT_BUFF, DIRECT_ITEM];

    expect(computeBoostsForLap(items, items, 1, {}).boostsByTag.performance).toBe(5);
    expect(computeBoostsForLap(items, items, 10, {}).boostsByTag.performance).toBe(5);
  });

  it("increments a stacking buff only on firing laps and never decreases it", () => {
    const items = [STACKING_BUFF, DIRECT_ITEM];
    const lap1 = computeBoostsForLap(items, items, 1, {});
    const lap2 = computeBoostsForLap(items, items, 2, lap1.stackingState);
    const lap4 = computeBoostsForLap(items, items, 4, lap2.stackingState);

    expect(lap1.boostsByTag.performance).toBe(2);
    expect(lap2.boostsByTag.performance).toBe(2);
    expect(lap4.boostsByTag.performance).toBe(4);
    expect(lap4.stackingState[0]).toBe(4);
  });

  it("adds multiple flat and stacking buffs sharing a tag", () => {
    const items = [FLAT_BUFF, STACKING_BUFF, DIRECT_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});

    expect(result.boostsByTag.performance).toBe(7);
  });

  it("accumulates duplicate-id stacking buffs independently by position", () => {
    const duplicate = { ...STACKING_BUFF };
    const items = [STACKING_BUFF, duplicate, DIRECT_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});

    expect(result.stackingState).toEqual({ 0: 2, 1: 2 });
    expect(result.boostsByTag.performance).toBe(4);
  });

  it("keeps unmatched flat and stacking buffs inert while stacking still advances", () => {
    const flat = computeBoostsForLap([FLAT_BUFF], [FLAT_BUFF], 1, {});
    const stacking = computeBoostsForLap([STACKING_BUFF], [STACKING_BUFF], 1, {});

    expect(flat.boostsByTag.performance ?? 0).toBe(0);
    expect(stacking.boostsByTag.performance ?? 0).toBe(0);
    expect(stacking.stackingState[0]).toBe(2);
  });

  it("does not mutate items or incoming stacking state", () => {
    const items = [STACKING_BUFF, DIRECT_ITEM];
    const state = { 0: 2 };
    const itemsSnapshot = structuredClone(items);
    const stateSnapshot = structuredClone(state);
    const result = computeBoostsForLap(items, items, 4, state);

    expect(items).toEqual(itemsSnapshot);
    expect(state).toEqual(stateSnapshot);
    expect(result.stackingState).not.toBe(state);
  });

  it("scales a count-synergy buff's boost by the qualifying count", () => {
    const twoMatches = [COUNT_BUFF, DIRECT_ITEM, { ...DIRECT_ITEM, id: "direct-2" }];

    expect(computeBoostsForLap(twoMatches, twoMatches, 1, {}).boostsByTag.performance).toBe(6);
  });

  it("is inert when the qualifying count is zero", () => {
    const result = computeBoostsForLap([COUNT_BUFF], [COUNT_BUFF], 1, {});

    expect(result.boostsByTag.performance ?? 0).toBe(0);
  });

  it("counts a matching item present only in allHeldItems (inert storage), not activeItems", () => {
    const inertMatch = { ...DIRECT_ITEM, id: "inert-match" };
    const activeItems = [COUNT_BUFF, DIRECT_ITEM];
    const allHeldItems = [COUNT_BUFF, DIRECT_ITEM, inertMatch];

    const result = computeBoostsForLap(activeItems, allHeldItems, 1, {});

    // rate 3 * count 2 (DIRECT_ITEM + inertMatch) = 6
    expect(result.boostsByTag.performance).toBe(6);
  });

  it("does not process a count-synergy buff that is itself absent from activeItems", () => {
    const allHeldItems = [COUNT_BUFF, DIRECT_ITEM];
    const result = computeBoostsForLap([DIRECT_ITEM], allHeldItems, 1, {});

    expect(result.boostsByTag.performance ?? 0).toBe(0);
  });

  it("sums a count-synergy buff's contribution with a flat buff sharing its tag", () => {
    const items = [COUNT_BUFF, FLAT_BUFF, DIRECT_ITEM];

    // count-synergy: 3 * 1 (DIRECT_ITEM) = 3; flat: 5; total 8
    expect(computeBoostsForLap(items, items, 1, {}).boostsByTag.performance).toBe(8);
  });

  it("never writes to stackingState for a count-synergy buff", () => {
    const items = [COUNT_BUFF, DIRECT_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});

    expect(result.stackingState).toEqual({});
  });
});