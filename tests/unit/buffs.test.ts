import { describe, expect, it } from "vitest";
import {
  computeBoostsForLap,
  hasDeltaForStat,
  isCountSynergyBuff,
  isValueScaledBuff,
  matchingDirectItemCount,
  sumFittedValue,
} from "../../src/simulation/buffs";
import type { OfferedItem, StatTarget } from "../../src/simulation/types";
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

// 023-stat-targeted-amplifiers Foundational (T002): StatTarget/targetStat
// shape coexists with every existing Buff field; undefined and "time" mean
// the same thing everywhere this field is read.
describe("StatTarget / Buff.targetStat shape (T002)", () => {
  it("Buff.targetStat is optional and accepts every StatTarget value", () => {
    const legacyImplicit: OfferedItem["buff"] = { boostPercent: 5 };
    const legacyExplicit: OfferedItem["buff"] = { boostPercent: 5, targetStat: "time" };
    const statTargets: StatTarget[] = ["time", "acceleration", "topSpeed", "brakingPower", "corneringSpeed"];

    expect(legacyImplicit.targetStat).toBeUndefined();
    expect(legacyExplicit.targetStat).toBe("time");
    statTargets.forEach((target) => {
      const buff: OfferedItem["buff"] = { boostPercent: 10, targetStat: target };
      expect(buff.targetStat).toBe(target);
    });
  });
});

// 023-stat-targeted-amplifiers Foundational (T003): the pure structural
// eligibility helper — reads only the candidate's own authored shape, never
// a track or corner condition (research.md Decision 2/6).
describe("hasDeltaForStat (T003, contract §2)", () => {
  it("is true when the item's flat physics field has the matching delta", () => {
    const item = testItem({
      id: "flat-accel", name: "Flat Accel", price: 0, timeModifier: 0,
      physics: { accelerationDelta: 10 },
    });
    expect(hasDeltaForStat(item, "acceleration")).toBe(true);
    expect(hasDeltaForStat(item, "topSpeed")).toBe(false);
  });

  it("is true when any conditionalPhysics entry has the matching delta, regardless of its own condition", () => {
    const item = testItem({
      id: "cond-brake", name: "Cond Brake", price: 0, timeModifier: 0,
      conditionalPhysics: [{
        condition: { kind: "corner-tightness", direction: "at-least", turnDegrees: 200 }, // never matches any real track
        delta: { brakingPowerDelta: 15 },
      }],
    });
    expect(hasDeltaForStat(item, "brakingPower")).toBe(true);
  });

  it("is false when the item has neither a flat nor a conditional delta for the stat", () => {
    const item = testItem({ id: "inert", name: "Inert", price: 0, timeModifier: 0 });
    expect(hasDeltaForStat(item, "acceleration")).toBe(false);
    expect(hasDeltaForStat(item, "corneringSpeed")).toBe(false);
  });

  it("is pure and deterministic", () => {
    const item = testItem({
      id: "pure-check", name: "Pure Check", price: 0, timeModifier: 0,
      physics: { topSpeedDelta: 5 },
    });
    expect(hasDeltaForStat(item, "topSpeed")).toBe(hasDeltaForStat(item, "topSpeed"));
  });
});

// 023-stat-targeted-amplifiers US1 (T007-T009): computeBoostsForLap's new
// boostsByStat output, alongside the completely untouched boostsByTag path.
describe("computeBoostsForLap — stat-targeted Buffs (T007-T009, US1, contract §2)", () => {
  const ACCEL_ITEM: OfferedItem = testItem({
    id: "accel-item", name: "Accel Item", price: 0, timeModifier: 0,
    physics: { accelerationDelta: 10 },
  });
  const NO_MATCH_ITEM: OfferedItem = testItem({ id: "no-match", name: "No Match", price: 0, timeModifier: 0 });
  const FLAT_STAT_BUFF: OfferedItem = testItem({
    id: "flat-stat-buff", name: "Flat Stat Buff", price: 0, timeModifier: 0,
    buff: { boostPercent: 20, targetStat: "acceleration" },
  });
  const BRAKE_ITEM: OfferedItem = testItem({
    id: "brake-item", name: "Brake Item", price: 0, timeModifier: 0,
    physics: { brakingPowerDelta: 8 },
  });
  const COUNT_STAT_BUFF: OfferedItem = testItem({
    id: "count-stat-buff", name: "Count Stat Buff", price: 0, timeModifier: 0,
    buff: { boostPercent: 5, perCount: true, targetStat: "brakingPower" },
  });

  it("T007: a flat stat-targeted buff accumulates into boostsByStat, leaving boostsByTag untouched", () => {
    const items = [FLAT_STAT_BUFF, ACCEL_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});

    expect(result.boostsByStat.acceleration).toBe(20);
    expect(result.boostsByTag).toEqual({});
  });

  it("T007: eligibility is hasDeltaForStat, not identityTag — neither item carries one", () => {
    expect(FLAT_STAT_BUFF.identityTag).toBeUndefined();
    expect(ACCEL_ITEM.identityTag).toBeUndefined();
    const items = [FLAT_STAT_BUFF, ACCEL_ITEM];
    expect(computeBoostsForLap(items, items, 1, {}).boostsByStat.acceleration).toBe(20);
  });

  it("T007: is inert when no active item has a delta for the targeted stat", () => {
    const items = [FLAT_STAT_BUFF, NO_MATCH_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});
    expect(result.boostsByStat.acceleration ?? 0).toBe(0);
  });

  it("T008: a count-synergy stat-targeted buff scales by the count of OTHER active items with a delta for that stat", () => {
    const items = [COUNT_STAT_BUFF, BRAKE_ITEM, { ...BRAKE_ITEM, id: "brake-item-2" }];
    const result = computeBoostsForLap(items, items, 1, {});
    expect(result.boostsByStat.brakingPower).toBe(10);
  });

  it("T008: is inert when the qualifying count is zero", () => {
    const result = computeBoostsForLap([COUNT_STAT_BUFF], [COUNT_STAT_BUFF], 1, {});
    expect(result.boostsByStat.brakingPower ?? 0).toBe(0);
  });

  it("T009: every existing time-targeted scenario (flat/stacking/count) produces byte-identical boostsByTag", () => {
    expect(computeBoostsForLap([FLAT_BUFF, DIRECT_ITEM], [FLAT_BUFF, DIRECT_ITEM], 1, {}).boostsByTag)
      .toEqual({ performance: 5 });
    expect(computeBoostsForLap([STACKING_BUFF, DIRECT_ITEM], [STACKING_BUFF, DIRECT_ITEM], 1, {}).boostsByTag)
      .toEqual({ performance: 2 });
    expect(computeBoostsForLap([COUNT_BUFF, DIRECT_ITEM], [COUNT_BUFF, DIRECT_ITEM], 1, {}).boostsByTag)
      .toEqual({ performance: 3 });
  });

  it("T009: boostsByStat stays empty for every legacy time-targeted scenario", () => {
    const items = [FLAT_BUFF, STACKING_BUFF, COUNT_BUFF, DIRECT_ITEM];
    expect(computeBoostsForLap(items, items, 1, {}).boostsByStat).toEqual({});
  });
});

// 023-stat-targeted-amplifiers US2 (T020): the stacking accumulation branch
// extended to boostsByStat — identical formula to today's time-target
// stacking, just keyed by stat.
describe("computeBoostsForLap — stacking stat-targeted Buffs (T020, US2, contract §4)", () => {
  const ACCEL_ITEM: OfferedItem = testItem({
    id: "accel-item", name: "Accel Item", price: 0, timeModifier: 0,
    physics: { accelerationDelta: 10 },
  });
  const STACKING_STAT_BUFF: OfferedItem = testItem({
    id: "stacking-stat-buff", name: "Stacking Stat Buff", price: 0, timeModifier: 0,
    cooldown: 3,
    buff: { boostPercent: 4, targetStat: "acceleration" },
  });

  it("accumulates only on firing laps and never decreases (positive boostPercent)", () => {
    const items = [STACKING_STAT_BUFF, ACCEL_ITEM];
    const lap1 = computeBoostsForLap(items, items, 1, {});
    const lap2 = computeBoostsForLap(items, items, 2, lap1.stackingState);
    const lap4 = computeBoostsForLap(items, items, 4, lap2.stackingState);

    expect(lap1.boostsByStat.acceleration).toBe(4);
    expect(lap2.boostsByStat.acceleration).toBe(4);
    expect(lap4.boostsByStat.acceleration).toBe(8);
  });

  it("accumulates downward with a negative boostPercent", () => {
    const decayingBuff = testItem({
      id: "decaying-stat-buff", name: "Decaying Stat Buff", price: 0, timeModifier: 0,
      cooldown: 3, buff: { boostPercent: -4, targetStat: "acceleration" },
    });
    const items = [decayingBuff, ACCEL_ITEM];
    const lap1 = computeBoostsForLap(items, items, 1, {});
    const lap4 = computeBoostsForLap(items, items, 4, lap1.stackingState);

    expect(lap1.boostsByStat.acceleration).toBe(-4);
    expect(lap4.boostsByStat.acceleration).toBe(-8);
  });

  it("writes stackingState using the same index-keyed convention as time-targeted stacking", () => {
    const items = [STACKING_STAT_BUFF, ACCEL_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});
    expect(result.stackingState[0]).toBe(4);
  });
});

// 020-character-item-pools: a buff whose applied boost scales with the
// summed authored price of fitted (vehicle-slot) items, not a matching-item
// count — Evelyn Mercer's "appraiser" chase card mechanism.
describe("sumFittedValue", () => {
  it("sums price across the given items", () => {
    const a = testItem({ id: "a", name: "A", price: 4, timeModifier: 0 });
    const b = testItem({ id: "b", name: "B", price: 2, timeModifier: 0 });
    expect(sumFittedValue([a, b])).toBe(6);
  });

  it("is 0 for an empty list", () => {
    expect(sumFittedValue([])).toBe(0);
  });
});

describe("isValueScaledBuff", () => {
  const VALUE_STAT_BUFF: OfferedItem = testItem({
    id: "value-stat-buff", name: "Value Stat Buff", price: 0, timeModifier: 0,
    buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
  });

  it("is true only for a buff item with scalesWithFittedValue set", () => {
    expect(isValueScaledBuff(VALUE_STAT_BUFF)).toBe(true);
    expect(isValueScaledBuff(FLAT_BUFF)).toBe(false);
    expect(isValueScaledBuff(COUNT_BUFF)).toBe(false);
    expect(isValueScaledBuff(DIRECT_ITEM)).toBe(false);
  });
});

describe("computeBoostsForLap — value-scaled Buffs (020-character-item-pools)", () => {
  const TOP_SPEED_ITEM: OfferedItem = testItem({
    id: "top-speed-item", name: "Top Speed Item", price: 4, timeModifier: 0,
    physics: { topSpeedDelta: 6 },
  });
  const VALUE_STAT_BUFF: OfferedItem = testItem({
    id: "value-stat-buff", name: "Value Stat Buff", price: 3, timeModifier: 0,
    buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
  });
  const VALUE_TIME_BUFF: OfferedItem = testItem({
    id: "value-time-buff", name: "Value Time Buff", price: 3, timeModifier: 0,
    identityTag: "performance",
    buff: { boostPercent: 1, scalesWithFittedValue: true },
  });

  it("scales the applied boost by fittedValue, ignoring perCount/stacking magnitude entirely", () => {
    const items = [VALUE_STAT_BUFF, TOP_SPEED_ITEM];
    const result = computeBoostsForLap(items, items, 1, {}, 10);
    expect(result.boostsByStat.topSpeed).toBe(10);
  });

  it("defaults fittedValue to 0 when not supplied, producing zero boost", () => {
    const items = [VALUE_STAT_BUFF, TOP_SPEED_ITEM];
    const result = computeBoostsForLap(items, items, 1, {});
    expect(result.boostsByStat.topSpeed ?? 0).toBe(0);
  });

  it("still requires an eligible matching-stat candidate to apply at all", () => {
    const result = computeBoostsForLap([VALUE_STAT_BUFF], [VALUE_STAT_BUFF], 1, {}, 10);
    expect(result.boostsByStat.topSpeed ?? 0).toBe(0);
  });

  it("also applies on the legacy time-targeted path when the item carries a matching identityTag", () => {
    const items = [VALUE_TIME_BUFF, DIRECT_ITEM];
    const result = computeBoostsForLap(items, items, 1, {}, 10);
    expect(result.boostsByTag.performance).toBe(10);
  });

  it("is unaffected by a cooldown field — value-scaling is a magnitude source, not a trigger shape", () => {
    const cooldownValueBuff = testItem({
      id: "cooldown-value-buff", name: "Cooldown Value Buff", price: 0, timeModifier: 0,
      cooldown: 2, buff: { boostPercent: 1, targetStat: "topSpeed", scalesWithFittedValue: true },
    });
    const items = [cooldownValueBuff, TOP_SPEED_ITEM];
    const result = computeBoostsForLap(items, items, 1, {}, 10);
    // Value-scaling takes priority over the stacking/cooldown branch — the
    // magnitude formula stays boostPercent * fittedValue on every lap,
    // never accumulating via stackingState.
    expect(result.boostsByStat.topSpeed).toBe(10);
  });
});