import { describe, expect, it } from "vitest";
import { BASELINE_CAR, SAMPLE_GHOST } from "../../src/content/sample-data";
import { ghostLapTimes, resolveContest } from "../../src/simulation/contest";
import {
  LAP_COUNT,
  SLOT_CAPACITY,
  STORAGE_CAPACITY,
  type Build,
  type OfferedItem,
  type SampleGhost,
} from "../../src/simulation/types";

function emptyBuild(): Build {
  return {
    car: BASELINE_CAR,
    board: Array(SLOT_CAPACITY).fill(null),
    storage: Array(STORAGE_CAPACITY).fill(null),
  };
}

describe("resolveContest lap-loop shell", () => {
  it("returns deterministic lap-by-lap results", () => {
    const build = emptyBuild();
    const first = resolveContest(build, SAMPLE_GHOST);

    expect(resolveContest(build, SAMPLE_GHOST)).toEqual(first);
    expect(first.laps).toHaveLength(LAP_COUNT);
    first.laps.forEach((lap, index) => {
      expect(lap).toEqual({
        lap: index + 1,
        playerLapTime: BASELINE_CAR.baseLapTime,
        ghostLapTime: SAMPLE_GHOST.lapTime,
        firedItems: [],
      });
    });
  });

  it("derives empty-build totals and a loss from per-lap values", () => {
    const result = resolveContest(emptyBuild(), SAMPLE_GHOST);

    expect(result.playerTime).toBe(BASELINE_CAR.baseLapTime * LAP_COUNT);
    expect(result.ghostTime).toBeCloseTo(SAMPLE_GHOST.lapTime * LAP_COUNT);
    expect(result.gap).toBe(result.playerTime - result.ghostTime);
    expect(result.outcome).toBe("loss");
  });

  it("preserves win and tie outcome rules", () => {
    const slowGhost: SampleGhost = { id: "slow-ghost", lapTime: 7 };
    const tieGhost: SampleGhost = { id: "tie-ghost", lapTime: BASELINE_CAR.baseLapTime };

    expect(resolveContest(emptyBuild(), slowGhost).outcome).toBe("win");
    expect(resolveContest(emptyBuild(), tieGhost).outcome).toBe("tie");
  });

  it("does not mutate inputs", () => {
    const build = emptyBuild();
    const buildSnapshot = structuredClone(build);
    const ghostSnapshot = structuredClone(SAMPLE_GHOST);
    resolveContest(build, SAMPLE_GHOST);

    expect(build).toEqual(buildSnapshot);
    expect(SAMPLE_GHOST).toEqual(ghostSnapshot);
  });
});

describe("ghostLapTimes", () => {
  it("returns exactly LAP_COUNT identical laps and an exact derived total", () => {
    const laps = ghostLapTimes(SAMPLE_GHOST);

    expect(laps).toHaveLength(LAP_COUNT);
    expect(laps.every((lapTime) => lapTime === SAMPLE_GHOST.lapTime)).toBe(true);
    expect(laps.reduce((sum, lapTime) => sum + lapTime, 0)).toBeCloseTo(
      SAMPLE_GHOST.lapTime * LAP_COUNT
    );
    expect(resolveContest(emptyBuild(), SAMPLE_GHOST).ghostTime).toBeCloseTo(
      SAMPLE_GHOST.lapTime * LAP_COUNT
    );
  });
});

describe("ContestResult lap breakdown", () => {
  it("records real item firings and reconstructs both reported totals exactly", () => {
    const directItem: OfferedItem = {
      id: "periodic-direct",
      name: "Periodic Direct",
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
    const result = resolveContest(
      { ...emptyBuild(), board: [directItem, flatBuff, stackingBuff] },
      SAMPLE_GHOST
    );

    expect(result.laps).toHaveLength(LAP_COUNT);
    result.laps.forEach((lap) => {
      const expectedIds = [1, 4, 7, 10].includes(lap.lap)
        ? [directItem.id, flatBuff.id, stackingBuff.id]
        : [flatBuff.id];
      expect(lap.firedItems.map((item) => item.id)).toEqual(expectedIds);
      [directItem.id, stackingBuff.id].forEach((id) => {
        expect(lap.firedItems.some((item) => item.id === id)).toBe(
          [1, 4, 7, 10].includes(lap.lap)
        );
      });
    });
    expect(result.laps.reduce((sum, lap) => sum + lap.playerLapTime, 0)).toBe(
      result.playerTime
    );
    expect(result.laps.reduce((sum, lap) => sum + lap.ghostLapTime, 0)).toBe(
      result.ghostTime
    );
  });
});

describe("lap simulation order independence", () => {
  it("produces identical outcomes and lap times for permutations of the same items", () => {
    const directItem: OfferedItem = {
      id: "order-direct",
      name: "Order Direct",
      timeModifier: -2,
      identityTag: "performance",
      cooldown: 2,
    };
    const flatBuff: OfferedItem = {
      id: "order-flat",
      name: "Order Flat",
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    };
    const stackingBuff: OfferedItem = {
      id: "order-stacking",
      name: "Order Stacking",
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    };
    const first = resolveContest(
      { ...emptyBuild(), board: [directItem, flatBuff, stackingBuff] },
      SAMPLE_GHOST
    );
    const second = resolveContest(
      { ...emptyBuild(), board: [stackingBuff, directItem, flatBuff] },
      SAMPLE_GHOST
    );

    expect(second.playerTime).toBe(first.playerTime);
    expect(second.gap).toBe(first.gap);
    expect(second.outcome).toBe(first.outcome);
    expect(second.laps.map((lap) => lap.playerLapTime)).toEqual(
      first.laps.map((lap) => lap.playerLapTime)
    );
  });
});