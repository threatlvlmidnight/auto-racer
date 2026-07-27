import { describe, expect, it } from "vitest";
import { firesOnLap, simulatePlayerLaps } from "../../src/simulation/laps";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  SLOT_CAPACITY,
  STORAGE_CAPACITY,
  type Build,
  type OfferedItem,
} from "../../src/simulation/types";

function emptyBuild(): Build {
  return {
    car: { id: "test-car", baseLapTime: 6 },
    board: Array(SLOT_CAPACITY).fill(null),
    storage: Array(STORAGE_CAPACITY).fill(null),
  };
}

describe("simulatePlayerLaps", () => {
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

  it("applies and records a cooldown-1 direct item every lap", () => {
    const item: OfferedItem = {
      id: "every-lap",
      name: "Every Lap",
      timeModifier: -1,
      cooldown: 1,
    };
    const result = simulatePlayerLaps({ ...emptyBuild(), board: [item, null, null] });

    result.forEach((lap) => {
      expect(lap.time).toBe(5);
      expect(lap.firedItems).toEqual([{ id: item.id, contribution: -1 }]);
    });
  });

  it("applies and records a cooldown-3 direct item only on predicted laps", () => {
    const item: OfferedItem = {
      id: "periodic",
      name: "Periodic",
      timeModifier: -1,
      cooldown: 3,
    };
    const result = simulatePlayerLaps({ ...emptyBuild(), board: [item, null, null] });

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
    const direct: OfferedItem = {
      id: "aggressive-direct",
      name: "Aggressive Direct",
      timeModifier: -10,
      identityTag: "performance",
      cooldown: 1,
    };
    const stackingBuff: OfferedItem = {
      id: "aggressive-stack",
      name: "Aggressive Stack",
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 1,
      buff: { boostPercent: 100 },
    };
    const result = simulatePlayerLaps({
      ...emptyBuild(),
      board: [direct, stackingBuff, null],
    });

    result.forEach((lap) => expect(lap.time).toBe(MIN_LAP_TIME));
  });

  it("records flat and stacking buff contributions on their firing laps", () => {
    const direct: OfferedItem = {
      id: "boosted-direct",
      name: "Boosted Direct",
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 3,
    };
    const flatBuff: OfferedItem = {
      id: "flat-buff",
      name: "Flat Buff",
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    };
    const stackingBuff: OfferedItem = {
      id: "stacking-buff",
      name: "Stacking Buff",
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    };
    const result = simulatePlayerLaps({
      ...emptyBuild(),
      board: [direct, flatBuff, stackingBuff],
    });

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