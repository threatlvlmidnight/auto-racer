import { describe, expect, it } from "vitest";
import { BASELINE_CAR, SAMPLE_GHOST } from "../../src/content/sample-data";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { ContestResolutionError, ghostLapTimes, resolveContest } from "../../src/simulation/contest";
import {
  LAP_COUNT,
  type Build,
  type OfferedItem,
  type RivalProfile,
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

// Every rival draws real items via resolveRivalBuild's own RNG, so these
// tests use a "tie roster" (zero slots filled) whenever exact-time
// assertions are needed, and the real RIVAL_PROFILES catalog otherwise.
const tieRoster: readonly RivalProfile[] = RIVAL_PROFILES.map((profile) => ({
  ...profile,
  levelScaling: () => ({ slotsToFill: 0, priceBias: "low" as const }),
}));

describe("resolveContest (N-car, US1/US2)", () => {
  it("resolves exactly 8 cars — the player plus every one of the 7 rivals", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);

    expect(result.cars).toHaveLength(8);
    expect(result.cars.filter((car) => car.role === "player")).toHaveLength(1);
    expect(result.cars.filter((car) => car.role === "rival")).toHaveLength(7);
    const rivalIds = result.cars.filter((car) => car.role === "rival").map((car) => car.id);
    expect(new Set(rivalIds)).toEqual(new Set(RIVAL_PROFILES.map((profile) => profile.id)));
  });

  it("assigns a contiguous 1..8 position permutation with no gaps or duplicates", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42);
    const positions = result.cars.map((car) => car.position).sort((a, b) => a - b);

    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("is deterministic — identical (build, roster, level, seed, lapCount) always resolves identically", () => {
    const first = resolveContest(emptyBuild(), RIVAL_PROFILES, 2, 7, 12);
    const second = resolveContest(emptyBuild(), RIVAL_PROFILES, 2, 7, 12);

    expect(second).toEqual(first);
  });

  it("does not mutate the player build or the rival roster", () => {
    const build = emptyBuild();
    const buildSnapshot = structuredClone(build);
    const rosterSnapshot = structuredClone(RIVAL_PROFILES.map(({ id, name, color, vehicleId }) => ({
      id,
      name,
      color,
      vehicleId,
    })));
    resolveContest(build, RIVAL_PROFILES, 1, 42);

    expect(build).toEqual(buildSnapshot);
    expect(RIVAL_PROFILES.map(({ id, name, color, vehicleId }) => ({ id, name, color, vehicleId })))
      .toEqual(rosterSnapshot);
  });

  it("rejects a roster that is not exactly 7 rivals with a typed, inspectable failure", () => {
    expect(() => resolveContest(emptyBuild(), RIVAL_PROFILES.slice(0, 6), 1, 42)).toThrow(
      ContestResolutionError,
    );
    try {
      resolveContest(emptyBuild(), RIVAL_PROFILES.slice(0, 6), 1, 42);
      throw new Error("expected resolveContest to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ContestResolutionError);
      expect((error as ContestResolutionError).code).toBe("invalid-roster-size");
    }
  });

  it("breaks exact ties by fixed roster order — player first, then rivals in catalog order", () => {
    const result = resolveContest(emptyBuild(), tieRoster, 1, 42);

    expect(result.cars.every((car) => car.time === result.cars[0].time)).toBe(true);
    expect(result.cars.map((car) => car.id)).toEqual([
      "player",
      ...tieRoster.map((profile) => profile.id),
    ]);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.cars.every((car) => car.gapToLeader === 0)).toBe(true);
  });

  it("derives outcome as win when the player finishes at position 1", () => {
    const result = resolveContest(emptyBuild(), tieRoster, 1, 42);

    expect(result.cars.find((car) => car.role === "player")?.position).toBe(1);
    expect(result.outcome).toBe("win");
  });

  it("keeps board/storage as the player's own items, unchanged meaning", () => {
    const directItem: OfferedItem = testItem({
      id: "n-car-direct",
      name: "N-Car Direct",
      price: 2,
      timeModifier: -1,
    });
    const result = resolveContest(vehicleBuild([directItem]), tieRoster, 1, 42);

    expect(result.board.map((item) => item.id)).toEqual([directItem.id]);
    expect(result.storage).toEqual([]);
  });

  it("gives every car a full per-lap breakdown, not just the player", () => {
    const result = resolveContest(emptyBuild(), RIVAL_PROFILES, 1, 42, 10);

    result.cars.forEach((car) => {
      expect(car.laps).toHaveLength(10);
      expect(car.time).toBeCloseTo(car.laps.reduce((sum, lap) => sum + lap.time, 0));
    });
  });

  it("still races against the existing single-SampleGhost path unchanged (FR-011 — Test Day/Practice)", () => {
    const legacy = resolveContest(emptyBuild(), SAMPLE_GHOST, 10);

    expect(legacy.playerTime).toBe(BASELINE_CAR.baseLapTime * 10);
    expect(legacy.ghostTime).toBeCloseTo(SAMPLE_GHOST.lapTime * 10);
  });
});