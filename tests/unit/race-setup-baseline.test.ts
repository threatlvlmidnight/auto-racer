import { describe, expect, it } from "vitest";
import { resolveContest } from "../../src/simulation/contest";
import { simulatePlayerLaps } from "../../src/simulation/laps";
import { generateTrack } from "../../src/simulation/tracks";
import { RIVAL_PROFILES } from "../../src/content/rivals";
import { SAMPLE_GHOST } from "../../src/content/sample-data";
import { vehicleBuild, testItem } from "../fixtures/vehicle-build-fixtures";

/**
 * Feature 028 T004: pre-migration snapshot of Balanced/no-setup outputs.
 * Feature 028 replaces the singular proof `raceSetup.ts`/`PreRaceScene.ts`
 * brake-balance shape with a versioned multi-control domain and moves setup
 * evidence onto each `CarResult`. None of that migration may change a
 * Balanced/no-setup build's lap or contest output — every value pinned here
 * (data-model.md, contract §5 "Balanced setup must preserve existing lap
 * outputs exactly") MUST remain byte-identical afterward.
 */
describe("baseline: Balanced/no-setup outputs before feature 028 migration", () => {
  it("pins simulatePlayerLaps for an empty build with a track (no setupDeltas)", () => {
    const build = vehicleBuild([]);
    const track = generateTrack(1, 1);
    const laps = simulatePlayerLaps(build, 10, track);

    expect(laps).toHaveLength(10);
    expect(laps.map((lap) => lap.time)).toMatchSnapshot();
    expect(laps[0].physics?.stats).toMatchSnapshot();
  });

  it("pins simulatePlayerLaps for a held-item build with all-zero setupDeltas explicitly passed", () => {
    const item = testItem({
      id: "baseline-item",
      name: "Baseline Item",
      price: 0,
      timeModifier: 0,
      physics: { brakingPowerDelta: 10, corneringSpeedDelta: 2 },
    });
    const build = vehicleBuild([item]);
    const track = generateTrack(1, 1);
    const withoutDeltas = simulatePlayerLaps(build, 10, track);
    const withZeroDeltas = simulatePlayerLaps(build, 10, track, { brakingPowerDelta: 0, corneringSpeedDelta: 0 });

    expect(withZeroDeltas).toEqual(withoutDeltas);
    expect(withoutDeltas.map((lap) => lap.time)).toMatchSnapshot();
  });

  it("pins the legacy 2-car resolveContest result for an empty build", () => {
    const build = vehicleBuild([]);
    const result = resolveContest(build, SAMPLE_GHOST, 10);

    expect(result.outcome).toMatchSnapshot();
    expect(result.playerTime).toMatchSnapshot();
    expect(result.gap).toMatchSnapshot();
  });

  it("pins the N-car resolveContest result for an empty build with no setup argument", () => {
    const build = vehicleBuild([]);
    const result = resolveContest(build, RIVAL_PROFILES, 1, 42);

    expect(result.outcome).toBe("loss");
    expect("setup" in result).toBe(false);
    const player = result.cars.find((car) => car.role === "player")!;
    expect(player.time).toMatchSnapshot();
    expect(player.position).toMatchSnapshot();
  });

  it("resolves identically on repeated calls (determinism baseline)", () => {
    const build = vehicleBuild([]);
    const first = resolveContest(build, RIVAL_PROFILES, 1, 42);
    const second = resolveContest(build, RIVAL_PROFILES, 1, 42);

    expect(second).toEqual(first);
  });
});
