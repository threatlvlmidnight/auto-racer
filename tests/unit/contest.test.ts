import { describe, expect, it } from "vitest";
import { BASELINE_CAR, SAMPLE_GHOST } from "../../src/content/sample-data";
import { ghostLapTimes, resolveContest } from "../../src/simulation/contest";
import {
  LAP_COUNT,
  type Build,
  type OfferedItem,
  type SampleGhost,
} from "../../src/simulation/types";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function emptyBuild(): Build {
  return vehicleBuild();
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
        contributions: [],
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

  it("stores explicit lap count and adds only the two scheduled laps at 12", () => {
    const ten = resolveContest(emptyBuild(), SAMPLE_GHOST, 10);
    const twelve = resolveContest(emptyBuild(), SAMPLE_GHOST, 12);

    expect(ten.lapCount).toBe(10);
    expect(twelve.lapCount).toBe(12);
    expect(ten.laps).toHaveLength(10);
    expect(twelve.laps).toHaveLength(12);
    expect(twelve.laps.slice(0, 10)).toEqual(ten.laps);
    expect(twelve.playerTime).toBe(ten.playerTime + BASELINE_CAR.baseLapTime * 2);
    expect(twelve.ghostTime).toBe(ten.ghostTime + SAMPLE_GHOST.lapTime * 2);
    expect(resolveContest(emptyBuild(), SAMPLE_GHOST, 10)).toEqual(ten);
    expect(resolveContest(emptyBuild(), SAMPLE_GHOST, 12)).toEqual(twelve);
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

  it("uses the supplied terminal count", () => {
    expect(ghostLapTimes(SAMPLE_GHOST, 10)).toHaveLength(10);
    expect(ghostLapTimes(SAMPLE_GHOST, 12)).toHaveLength(12);
  });
});

describe("ContestResult lap breakdown", () => {
  it("records real item firings and reconstructs both reported totals exactly", () => {
    const directItem: OfferedItem = testItem({
      id: "periodic-direct",
      name: "Periodic Direct",
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
    const result = resolveContest(
      vehicleBuild([directItem, flatBuff, stackingBuff]),
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

describe("count-synergy buff (SC-003)", () => {
  it("changes the outcome when an extra matching item sits inert in storage vs. absent entirely", () => {
    const countBuff: OfferedItem = testItem({
      id: "count-buff",
      name: "Count Buff",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 3, perCount: true },
    });
    const receiver: OfferedItem = testItem({
      id: "receiver",
      name: "Receiver",
      price: 2,
      timeModifier: -2,
      identityTag: "performance",
      cooldown: 1,
    });
    const extraMatch: OfferedItem = testItem({
      id: "extra-match",
      name: "Extra Match",
      price: 2,
      timeModifier: -1,
      identityTag: "performance",
      cooldown: 1,
    });

    const withInertExtra = resolveContest(
      vehicleBuild([countBuff, receiver, null], [extraMatch, null, null]),
      SAMPLE_GHOST
    );
    const withoutExtra = resolveContest(
      vehicleBuild([countBuff, receiver, null]),
      SAMPLE_GHOST
    );

    expect(withInertExtra.playerTime).not.toBe(withoutExtra.playerTime);
    // qualifying count 2 (receiver + extraMatch) vs. 1 (receiver only):
    // receiver's boosted magnitude is -2 * (1 + boost/100) in each case.
    expect(withInertExtra.playerTime).toBeLessThan(withoutExtra.playerTime);
  });
});

describe("lap simulation order independence", () => {
  it("produces identical outcomes and lap times for permutations of the same items", () => {
    const directItem: OfferedItem = testItem({
      id: "order-direct",
      name: "Order Direct",
      price: 2,
      timeModifier: -2,
      identityTag: "performance",
      cooldown: 2,
    });
    const flatBuff: OfferedItem = testItem({
      id: "order-flat",
      name: "Order Flat",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      buff: { boostPercent: 5 },
    });
    const stackingBuff: OfferedItem = testItem({
      id: "order-stacking",
      name: "Order Stacking",
      price: 2,
      timeModifier: 0,
      identityTag: "performance",
      cooldown: 3,
      buff: { boostPercent: 1 },
    });
    const first = resolveContest(
      vehicleBuild([directItem, flatBuff, stackingBuff]),
      SAMPLE_GHOST
    );
    const second = resolveContest(
      vehicleBuild([stackingBuff, directItem, flatBuff]),
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