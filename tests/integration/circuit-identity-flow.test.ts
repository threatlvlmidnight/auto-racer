import { describe, expect, it } from "vitest";
import { regionDefinition } from "../../src/content/regions";
import {
  completeNonPvpEncounter,
  createRun,
  runIdentityForEntrant,
  summarizeRunHistory,
} from "../../src/simulation/run";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  circuitPresentationIdentity,
  circuitIdentityLine,
  scheduledRaceLine,
  testDayCircuitIdentity,
} from "../../src/scenes/circuitPresentation";
import {
  contestSceneInput,
  continueRunFromResult,
  historyCircuitFacts,
} from "../../src/scenes/runPresentation";
import {
  identityTrack,
  britishIslesStage,
} from "../fixtures/interface-clarity-fixtures";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function scoredRun() {
  return createRun({
    runId: "circuit-agreement-run",
    seed: 42,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng: () => 0,
  });
}

describe("Feature 035 cross-surface circuit identity agreement (T019)", () => {
  it("reports the same LOCATION region on scheduled, scored, and history surfaces", () => {
    let run = scoredRun();
    for (let i = 0; i < 2; i += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    run = {
      ...run,
      stages: run.stages.map((stage, index) => (index === run.stageIndex ? { ...stage, regionId: "british-isles", raceKind: "local" } : stage)),
    };

    // Scheduled surface (used by RunScene/CURRENT LEG caption) — region LOCATION.
    const scheduled = scheduledRaceLine(run.stages[run.stageIndex]);
    expect(scheduled).toBe(`LOCATION: ${regionDefinition("british-isles").name} · LOCAL RACE`);

    // Pre-Race briefing identity (used by PreRaceScene).
    const briefing = circuitPresentationIdentity(identityTrack, britishIslesStage);
    expect(briefing.locationLabel).toBe(regionDefinition("british-isles").name);
    expect(briefing.mode).toBe("scored");

    // Live contest + Results identity use the resolved track + same region.
    const input = contestSceneInput(run, run.activeEncounter!.id);
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const live = circuitPresentationIdentity(result.track, run.stages[run.stageIndex]);
    expect(live.trackName).toBe(result.track.name);
    expect(live.locationLabel).toBe(regionDefinition("british-isles").name);

    // History identity consumes the retained circuit evidence.
    const continued = continueRunFromResult(run, input.encounterId, result, () => 0);
    const summary = summarizeRunHistory(continued);
    const historyEntry = summary[summary.length - 1];
    const history = historyCircuitFacts(historyEntry);
    expect(history?.locationLabel).toBe(regionDefinition("british-isles").name);
    expect(history?.trackName).toBe(result.track.name);

    // All scored surfaces agree on LOCATION for the same recorded race.
    const locations = [briefing.locationLabel, live.locationLabel, history!.locationLabel];
    expect(new Set(locations).size).toBe(1);
  });

  it("keeps Test Day consistently fixed and unscored, never geographic", () => {
    const identity = testDayCircuitIdentity(identityTrack);
    expect(identity.mode).toBe("test-day");
    expect(identity.fixedConfiguration).toBe(true);
    expect(identity.unscored).toBe(true);
    expect(circuitIdentityLine(identity)).toContain("UNSCORED");
    expect(identity.locationLabel).toBe("Fixed test configuration");
  });

  it("uses the explicit neutral fallback for a scored race with a missing region", () => {
    const identity = circuitPresentationIdentity(identityTrack, { raceKind: "championship" });
    expect(identity.locationLabel).toBe("Location unavailable");
    expect(identity.regionId).toBeUndefined();
  });
});
