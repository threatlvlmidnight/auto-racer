import { describe, expect, it } from "vitest";
import { computeBoostsForLap } from "../../src/simulation/buffs";
import type { OfferedItem } from "../../src/simulation/types";

const DIRECT_ITEM: OfferedItem = {
  id: "direct",
  name: "Direct Item",
  timeModifier: -4,
  identityTag: "performance",
  cooldown: 1,
};

const FLAT_BUFF: OfferedItem = {
  id: "flat-buff",
  name: "Flat Buff",
  timeModifier: 0,
  identityTag: "performance",
  buff: { boostPercent: 5 },
};

const STACKING_BUFF: OfferedItem = {
  id: "stacking-buff",
  name: "Stacking Buff",
  timeModifier: 0,
  identityTag: "performance",
  cooldown: 3,
  buff: { boostPercent: 2 },
};

describe("computeBoostsForLap", () => {
  it("keeps a flat buff constant from the first through final lap", () => {
    const items = [FLAT_BUFF, DIRECT_ITEM];

    expect(computeBoostsForLap(items, 1, {}).boostsByTag.performance).toBe(5);
    expect(computeBoostsForLap(items, 10, {}).boostsByTag.performance).toBe(5);
  });

  it("increments a stacking buff only on firing laps and never decreases it", () => {
    const items = [STACKING_BUFF, DIRECT_ITEM];
    const lap1 = computeBoostsForLap(items, 1, {});
    const lap2 = computeBoostsForLap(items, 2, lap1.stackingState);
    const lap4 = computeBoostsForLap(items, 4, lap2.stackingState);

    expect(lap1.boostsByTag.performance).toBe(2);
    expect(lap2.boostsByTag.performance).toBe(2);
    expect(lap4.boostsByTag.performance).toBe(4);
    expect(lap4.stackingState[0]).toBe(4);
  });

  it("adds multiple flat and stacking buffs sharing a tag", () => {
    const result = computeBoostsForLap([FLAT_BUFF, STACKING_BUFF, DIRECT_ITEM], 1, {});

    expect(result.boostsByTag.performance).toBe(7);
  });

  it("accumulates duplicate-id stacking buffs independently by position", () => {
    const duplicate = { ...STACKING_BUFF };
    const result = computeBoostsForLap([STACKING_BUFF, duplicate, DIRECT_ITEM], 1, {});

    expect(result.stackingState).toEqual({ 0: 2, 1: 2 });
    expect(result.boostsByTag.performance).toBe(4);
  });

  it("keeps unmatched flat and stacking buffs inert while stacking still advances", () => {
    const flat = computeBoostsForLap([FLAT_BUFF], 1, {});
    const stacking = computeBoostsForLap([STACKING_BUFF], 1, {});

    expect(flat.boostsByTag.performance ?? 0).toBe(0);
    expect(stacking.boostsByTag.performance ?? 0).toBe(0);
    expect(stacking.stackingState[0]).toBe(2);
  });

  it("does not mutate items or incoming stacking state", () => {
    const items = [STACKING_BUFF, DIRECT_ITEM];
    const state = { 0: 2 };
    const itemsSnapshot = structuredClone(items);
    const stateSnapshot = structuredClone(state);
    const result = computeBoostsForLap(items, 4, state);

    expect(items).toEqual(itemsSnapshot);
    expect(state).toEqual(stateSnapshot);
    expect(result.stackingState).not.toBe(state);
  });
});