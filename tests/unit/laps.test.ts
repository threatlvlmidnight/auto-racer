import { describe, expect, it } from "vitest";
import { firesOnLap, simulatePlayerLaps } from "../../src/simulation/laps";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type Build,
  type OfferedItem,
} from "../../src/simulation/types";
import {
  buffDependentPracticeBuild,
  minimumClampPracticeBuild,
  storageActivePracticeBuild,
} from "../fixtures/practice-fixtures";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function emptyBuild(): Build {
  return vehicleBuild();
}

describe("simulatePlayerLaps", () => {
  it("emits complete per-held-item source, trigger, buff, storage, and timing evidence", () => {
    const lap = simulatePlayerLaps(buffDependentPracticeBuild())[0];

    expect(lap.contributions).toHaveLength(6);
    lap.contributions.forEach((entry) => {
      expect(entry).toMatchObject({
        lap: 1,
        sourceItemId: expect.any(String),
        sourceLocation: { area: expect.stringMatching(/board|storage/), index: expect.any(Number) },
        effectKind: expect.any(String),
        triggerState: expect.any(String),
        baseContribution: expect.any(Number),
        buffApplications: expect.any(Array),
        resultingContribution: expect.any(Number),
        preClampLapTime: expect.any(Number),
        clampAdjustment: expect.any(Number),
        resultingLapTime: lap.time,
        storageActive: expect.any(Boolean),
      });
    });
    expect(lap.contributions.find(({ sourceItemId }) => sourceItemId === "item-001")?.buffApplications)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceItemId: "item-012", targetItemId: "item-001", type: "flat" }),
        expect.objectContaining({ sourceItemId: "item-014", targetItemId: "item-001", type: "stacking" }),
      ]));
  });

  it("distinguishes storage-active and inactive storage evidence", () => {
    const evidence = simulatePlayerLaps(storageActivePracticeBuild())[0].contributions;
    expect(evidence.find(({ sourceItemId }) => sourceItemId === "item-013")).toMatchObject({
      sourceLocation: { area: "storage", index: 0 },
      storageActive: true,
      triggerState: "fired",
    });
    expect(evidence.find(({ sourceItemId }) => sourceItemId === "item-001")).toMatchObject({
      sourceLocation: { area: "storage", index: 1 },
      storageActive: false,
      triggerState: "inactive-storage",
      resultingContribution: 0,
    });
  });

  it("reports pre-clamp time and exact minimum-time adjustment", () => {
    const lap = simulatePlayerLaps(minimumClampPracticeBuild())[0];
    expect(lap.time).toBe(MIN_LAP_TIME);
    expect(lap.contributions[0]).toMatchObject({
      preClampLapTime: -14,
      clampAdjustment: 14.1,
      resultingLapTime: MIN_LAP_TIME,
    });
  });

  it("returns exactly LAP_COUNT unmodified laps for an empty build", () => {
    const build = emptyBuild();
    const result = simulatePlayerLaps(build);

    expect(result).toHaveLength(LAP_COUNT);
    result.forEach((lap) => {
      expect(lap.time).toBe(build.car.baseLapTime);
      expect(lap.firedItems).toEqual([]);
    });
  });

  it("is deterministic for an identical build", () => {
    const build = emptyBuild();

    expect(simulatePlayerLaps(build)).toEqual(simulatePlayerLaps(build));
  });

  it("accepts explicit 10 and 12 lap counts without changing the first ten laps", () => {
    const item: OfferedItem = testItem({
      id: "variable-periodic",
      name: "Variable Periodic",
      price: 2,
      timeModifier: -1,
      cooldown: 3,
    });
    const build = vehicleBuild([item, null, null]);
    const ten = simulatePlayerLaps(build, 10);
    const twelve = simulatePlayerLaps(build, 12);

    expect(ten).toHaveLength(10);
    expect(twelve).toHaveLength(12);
    expect(twelve.slice(0, 10)).toEqual(ten);
    expect(twelve[10].firedItems).toEqual([]);
    expect(twelve[11].firedItems).toEqual([]);
    expect(twelve.every(({ time }) => time >= MIN_LAP_TIME)).toBe(true);
    expect(simulatePlayerLaps(build, 12)).toEqual(twelve);
  });

  it("applies and records a cooldown-1 direct item every lap", () => {
    const item: OfferedItem = testItem({
      id: "every-lap",
      name: "Every Lap",
      price: 2,
      timeModifier: -1,
      cooldown: 1,
    });
    const result = simulatePlayerLaps(vehicleBuild([item, null, null]));

    result.forEach((lap) => {
      expect(lap.time).toBe(5);
      expect(lap.firedItems).toEqual([{ id: item.id, contribution: -1 }]);
    });
  });

  it("applies and records a cooldown-3 direct item only on predicted laps", () => {
    const item: OfferedItem = testItem({
      id: "periodic",
      name: "Periodic",
      price: 2,
      timeModifier: -1,
      cooldown: 3,
    });
    const result = simulatePlayerLaps(vehicleBuild([item, null, null]));

    expect(result.map((lap) => lap.firedItems)).toEqual([
      [{ id: item.id, contribution: -1 }],
      [],
      [],
      [{ id: item.id, contribution: -1 }],
      [],
      [],
      [{ id: item.id, contribution: -1 }],
      [],
      [],
      [{ id: item.id, contribution: -1 }],
    ]);
    expect(result.map((lap) => lap.time)).toEqual([5, 6, 6, 5, 6, 6, 5, 6, 6, 5]);
  });

  it("clamps aggressive recurring and stacking effects to MIN_LAP_TIME", () => {
    const direct: OfferedItem = testItem({
      id: "aggressive-direct",
      name: "Aggressive Direct",
      price: 2,
      timeModifier: -10,
      identityTag: "performance",
      cooldown: 1,
    });
    const stackingBuff: OfferedItem = testItem({
      id: "aggressive-stack",
      name: "Aggressive Stack",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 1,
      buff: { boostPercent: 100 },
    });
    const result = simulatePlayerLaps(vehicleBuild([direct, stackingBuff, null]));

    result.forEach((lap) => expect(lap.time).toBe(MIN_LAP_TIME));
  });

  it("records flat and stacking buff contributions on their firing laps", () => {
    const direct: OfferedItem = testItem({
      id: "boosted-direct",
      name: "Boosted Direct",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 3,
    });
    const flatBuff: OfferedItem = testItem({
      id: "flat-buff",
      name: "Flat Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    });
    const stackingBuff: OfferedItem = testItem({
      id: "stacking-buff",
      name: "Stacking Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    });
    const result = simulatePlayerLaps(vehicleBuild([direct, flatBuff, stackingBuff]));

    expect(result[0].firedItems).toEqual([
      { id: direct.id, contribution: -1.06 },
      { id: flatBuff.id, contribution: 5 },
      { id: stackingBuff.id, contribution: 1 },
    ]);
    expect(result[1].firedItems).toEqual([{ id: flatBuff.id, contribution: 5 }]);
    expect(result[3].firedItems).toEqual([
      { id: direct.id, contribution: -1.07 },
      { id: flatBuff.id, contribution: 5 },
      { id: stackingBuff.id, contribution: 2 },
    ]);
  });

  it("records a count-synergy buff's contribution as rate times qualifying count, including inert storage matches", () => {
    const countBuff: OfferedItem = testItem({
      id: "count-buff",
      name: "Count Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 3, perCount: true },
    });
    const activeMatch: OfferedItem = testItem({
      id: "active-match",
      name: "Active Match",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 1,
    });
    const inertMatch: OfferedItem = testItem({
      id: "inert-match",
      name: "Inert Match",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 1,
    });
    const result = simulatePlayerLaps(vehicleBuild([countBuff, activeMatch, null], [inertMatch, null, null]));

    // qualifying count = 2 (activeMatch + inertMatch, inertMatch not active-while-stored);
    // contribution = 3 * 2 = 6, unaffected by activeMatch's own lap-to-lap firing.
    result.forEach((lap) => {
      const countBuffFired = lap.firedItems.find((fired) => fired.id === countBuff.id);
      expect(countBuffFired).toEqual({ id: countBuff.id, contribution: 6 });
    });
  });

  it("leaves direct items' own contributions unaffected by an unrelated count-synergy buff", () => {
    const countBuff: OfferedItem = testItem({
      id: "count-buff",
      name: "Count Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 100, perCount: true },
    });
    const unrelatedDirect: OfferedItem = testItem({
      id: "unrelated",
      name: "Unrelated",
      price: 2,
      timeModifier: -2,
      cooldown: 1,
    });
    const result = simulatePlayerLaps(vehicleBuild([countBuff, unrelatedDirect, null]));

    result.forEach((lap) => {
      const unrelatedFired = lap.firedItems.find((fired) => fired.id === unrelatedDirect.id);
      expect(unrelatedFired).toEqual({ id: unrelatedDirect.id, contribution: -2 });
    });
  });
});

describe("firesOnLap", () => {
  it("fires cooldown 1 on every lap", () => {
    expect(Array.from({ length: LAP_COUNT }, (_, index) => firesOnLap(1, index + 1))).toEqual(
      Array(LAP_COUNT).fill(true)
    );
  });

  it("fires cooldown N on laps 1, 1+N, 1+2N and no others", () => {
    const firingLaps = Array.from({ length: LAP_COUNT }, (_, index) => index + 1).filter((lap) =>
      firesOnLap(3, lap)
    );

    expect(firingLaps).toEqual([1, 4, 7, 10]);
    expect(firesOnLap(3, 4)).toBe(firesOnLap(3, 4));
  });
});