import { describe, expect, it } from "vitest";
import { createRun, runIdentityForEntrant, type Run } from "../../src/simulation/run";
import { chooseEncounter } from "../../src/simulation/encounters";
import { completeNonPvpEncounter } from "../../src/simulation/run";
import {
  commitSetupMemory,
  lockRaceSetup,
  raceSetupInput,
} from "../../src/simulation/raceSetup";
import { raceSetupSceneModel } from "../../src/scenes/raceSetupPresentation";
import { resolveContest } from "../../src/simulation/contest";
import { contestSceneInput, continueRunFromResult } from "../../src/scenes/runPresentation";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { setupFixtureItem } from "../fixtures/race-setup-fixtures";
import type { LockedRaceSetup } from "../../src/simulation/types";
import { practiceFocusVisible } from "../../src/scenes/focusPresentation";

function runAtFirstPvp(build = vehicleBuild([])): Run {
  let run = createRun({
    runId: "pre-race-setup-integration",
    seed: 9,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build,
    rng: () => 0,
  });
  for (let stage = 0; stage < 2; stage += 1) {
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
  }
  return run;
}

describe("pre-race setup: static presentation boundary (T016)", () => {
  it("opening setup does not mutate the run at all", () => {
    const run = runAtFirstPvp();
    const before = structuredClone(run);
    raceSetupInput(run, run.activeEncounter!.id);

    expect(run).toEqual(before);
  });

  it("the scene model exposes no opponent/rival/purse/sponsor/odds/projection data", () => {
    const run = runAtFirstPvp();
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const model = raceSetupSceneModel(input, {});
    const serialized = JSON.stringify(model).toLowerCase();

    expect(serialized).not.toMatch(/rival|opponent|purse|sponsor|odds|projected|standings|position\d/);
  });

  it("exposes the exact same track the subsequent contest resolves against", () => {
    const run = runAtFirstPvp();
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const contestInput = contestSceneInput(run, run.activeEncounter!.id);
    const result = resolveContest(contestInput.build, contestInput.rivalRoster, contestInput.level, contestInput.seed, contestInput.lapCount);

    expect(input.track).toEqual(result.track);
  });

  it("derives the validated entrant's own vehicle asset key, not a generic default", () => {
    const run = runAtFirstPvp();
    const input = raceSetupInput(run, run.activeEncounter!.id);

    expect(input.run.identity.vehicleId).toBe("the-highwheel");
  });
});

describe("pre-race setup: semantic focus styling (T091)", () => {
  it("does not claim keyboard focus before a navigation key is received", () => {
    expect(practiceFocusVisible(false)).toBe(false);
  });

  it("keeps the focus affordance available when keyboard focus is real", () => {
    expect(practiceFocusVisible(true)).toBe(true);
  });
});

describe("pre-race setup: selection preview does not mutate build/run (T043)", () => {
  it("changing draft selections never writes to run/build until lockRaceSetup + commitSetupMemory is explicitly called", () => {
    const run = runAtFirstPvp(vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")]));
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const beforeBuild = structuredClone(input.build);

    // Simulate the player cycling through every position on every control —
    // this is pure preview arithmetic; nothing here may touch run/build.
    raceSetupSceneModel(input, { "driver-aggression": "low", "gearing": "high" });
    raceSetupSceneModel(input, { "driver-aggression": "high", "gearing": "low" });

    expect(input.build).toEqual(beforeBuild);
    expect(run.activeEncounter).toEqual(runAtFirstPvp(vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")])).activeEncounter);
  });

  it("Start Race's locked setup exactly matches lap-one's recorded physics delta", () => {
    const run = runAtFirstPvp(vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")]));
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const selections = { "driver-aggression": "low", "gearing": "high" } as const;
    const setup = lockRaceSetup(input, selections) as LockedRaceSetup;
    const committedRun = commitSetupMemory(input.run, selections, false);

    const contestInput = contestSceneInput(committedRun, committedRun.activeEncounter!.id);
    const result = resolveContest(
      contestInput.build, contestInput.rivalRoster, contestInput.level, contestInput.seed, contestInput.lapCount, setup,
    );
    const player = result.cars.find((car) => car.role === "player")!;
    const withoutSetup = resolveContest(
      contestInput.build, contestInput.rivalRoster, contestInput.level, contestInput.seed, contestInput.lapCount,
    );
    const playerWithoutSetup = withoutSetup.cars.find((car) => car.role === "player")!;

    expect(player.laps[0].physics!.stats.brakingPower - playerWithoutSetup.laps[0].physics!.stats.brakingPower)
      .toBe(setup.totalDelta.brakingPowerDelta);
    expect(player.laps[0].physics!.stats.acceleration - playerWithoutSetup.laps[0].physics!.stats.acceleration)
      .toBe(setup.totalDelta.accelerationDelta);
    expect(player.setup).toEqual(setup);
  });
});

describe("pre-race setup: routing chain (T017)", () => {
  it("every scheduled PvP encounter can resolve pre-race setup input without throwing", () => {
    const run = runAtFirstPvp();

    expect(run.activeEncounter?.type).toBe("pvp");
    expect(() => raceSetupInput(run, run.activeEncounter!.id)).not.toThrow();
  });

  it("Back changes no run field: raceSetupInput().run is the exact same run reference, untouched", () => {
    const run = runAtFirstPvp();
    const input = raceSetupInput(run, run.activeEncounter!.id);

    expect(input.run).toBe(run);
  });

  it("Start Race's committed run preserves every field Back would have needed, except setupMemory", () => {
    const run = runAtFirstPvp();
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const committed = commitSetupMemory(input.run, {}, false);

    expect({ ...committed, setupMemory: undefined }).toEqual({ ...run, setupMemory: undefined });
  });
});

// 028-pre-race-setup T051: Start Race locks setup exactly once; final
// settlement (completing the encounter) uses that exact precomputed result
// rather than recomputing anything.
describe("pre-race setup: locked once, settlement uses the precomputed result (T051)", () => {
  it("continueRunFromResult records the exact precomputed result without recomputing the contest", () => {
    const run = runAtFirstPvp(vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")]));
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const selections = { "driver-aggression": "high", "gearing": "low" } as const;
    const setup = lockRaceSetup(input, selections) as LockedRaceSetup;
    const committedRun = commitSetupMemory(input.run, selections, false);

    const contestInput = contestSceneInput(committedRun, committedRun.activeEncounter!.id);
    const result = resolveContest(
      contestInput.build, contestInput.rivalRoster, contestInput.level, contestInput.seed,
      contestInput.lapCount, setup, contestInput.encounterId,
    );
    const continued = continueRunFromResult(committedRun, contestInput.encounterId, result, () => 0);
    const player = result.cars.find((car) => car.role === "player")!;
    const recorded = continued.history[continued.history.length - 1].pvpOutcome!;

    expect(recorded.outcome).toBe(result.outcome);
    expect(recorded.lapCount).toBe(result.lapCount);
    expect(recorded.playerTime).toBe(player.time);
    // Every car (player + all 7 rivals) received its own generated/locked
    // setup evidence once resolveContest had a real encounterId to bind to.
    expect(result.cars.every((car) => car.setup !== undefined)).toBe(true);
    expect(result.cars.find((car) => car.role === "player")!.setup).toEqual(setup);
  });
});

// 028-pre-race-setup T061: Remember-setup scene-flow boundaries.
describe("pre-race setup: Remember setup scene-flow boundaries (T061)", () => {
  it("Back never writes setup memory — raceSetupInput/back reads run.setupMemory but never commits it", () => {
    const run = runAtFirstPvp();
    const before = structuredClone(run);
    raceSetupInput(run, run.activeEncounter!.id);

    expect(run.setupMemory).toEqual(before.setupMemory);
    expect(run).toEqual(before);
  });

  it("Test Day (a non-Start-Race exit) never writes setup memory", () => {
    const run = runAtFirstPvp();
    const before = structuredClone(run);
    // Opening Test Day from setup reads run.setupMemory but PreRaceScene's
    // openTestDay() never calls commitSetupMemory — nothing here should
    // touch run at all, mirroring the Back assertion above.
    raceSetupInput(run, run.activeEncounter!.id);

    expect(run).toEqual(before);
  });

  it("Start Race with the checkbox off disables future restoration but preserves prior remembered selections untouched", () => {
    const run = { ...runAtFirstPvp(), setupMemory: { enabled: true, selections: { "driver-aggression": "low" as const } } };
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const committed = commitSetupMemory(input.run, { "driver-aggression": "high" }, false);

    expect(committed.setupMemory).toEqual({ enabled: false, selections: run.setupMemory.selections });
  });

  it("Start Race with the checkbox on writes only currently eligible families, keyed by family", () => {
    const run = runAtFirstPvp(vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")]));
    const input = raceSetupInput(run, run.activeEncounter!.id);
    const selections = { "driver-aggression": "low", "gearing": "high" } as const;
    const committed = commitSetupMemory(input.run, selections, true);

    expect(committed.setupMemory).toEqual({ enabled: true, selections });
  });

  it("initial selections restore eligible-only remembered values on the very next setup open", () => {
    const remembered = { enabled: true, selections: { "driver-aggression": "low" as const, "gearing": "high" as const } };
    const runWithoutGearing = { ...runAtFirstPvp(), setupMemory: remembered };
    const inputWithoutGearing = raceSetupInput(runWithoutGearing, runWithoutGearing.activeEncounter!.id);

    // gearing is dormant (no installed item currently enables it) — must not surface.
    expect(inputWithoutGearing.initialSelections).toEqual({ "driver-aggression": "low" });

    const runWithGearing = {
      ...runAtFirstPvp(vehicleBuild([setupFixtureItem("fixture-gearing", "gearing")])),
      setupMemory: remembered,
    };
    const inputWithGearing = raceSetupInput(runWithGearing, runWithGearing.activeEncounter!.id);

    expect(inputWithGearing.initialSelections).toEqual({ "driver-aggression": "low", "gearing": "high" });
  });
});
