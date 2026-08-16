import { describe, expect, it } from "vitest";
import { resolveContest } from "../../src/simulation/contest";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import { TIE_ROSTER } from "../fixtures/race-legibility-fixtures";

/**
 * 027-race-legibility-integrity T001/T017/T053: pre-feature snapshot of
 * `resolveContest`'s N-car result for a fixed (build, roster, level, seed).
 * Phase 3 adds `track`/`tieBreakOrder` evidence to `NCarContestResult` —
 * every value pinned here (lap times, positions, gaps, outcome, board,
 * storage) MUST remain byte-identical after that change (spec.md FR-022,
 * SC-004). Values captured directly from `resolveContest` before any
 * feature-027 code existed.
 */
describe("baseline: resolveContest(N-car) snapshot before feature 027", () => {
  it("pins internally reconciled ranking for the deterministic generated circuit", () => {
    const build = createEmptyVehicleBuild("the-highwheel");
    const result = resolveContest(build, RIVAL_PROFILES, 1, 42);

    expect(result.outcome).toBe("loss");
    expect(result.lapCount).toBe(10);
    expect(result.board).toEqual([]);
    expect(result.storage).toEqual([]);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const player = result.cars.find((car) => car.role === "player")!;
    expect(player.time).toBeCloseTo(player.laps.reduce((sum, lap) => sum + lap.time, 0), 9);
    expect(player.gapToLeader).toBeCloseTo(player.time - result.cars[0].time, 9);
    const leader = result.cars.find((car) => car.position === 1)!;
    expect(leader.gapToLeader).toBe(0);
  });

  it("pins the exact tie-break result for (empty build, TIE_ROSTER, level 1, seed 42)", () => {
    const build = createEmptyVehicleBuild("the-highwheel");
    const result = resolveContest(build, TIE_ROSTER, 1, 42);

    expect(result.outcome).toBe("win");
    expect(result.cars.map((car) => car.id)).toEqual([
      "player",
      ...TIE_ROSTER.map((profile) => profile.id),
    ]);
    expect(result.cars.every((car) => car.time === result.cars[0].time)).toBe(true);
    expect(result.cars.map((car) => car.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("resolves identically on repeated calls (determinism baseline for byte-identical regression proof)", () => {
    const build = createEmptyVehicleBuild("the-highwheel");
    const first = resolveContest(build, RIVAL_PROFILES, 1, 42);
    const second = resolveContest(build, RIVAL_PROFILES, 1, 42);

    expect(second).toEqual(first);
  });
});
