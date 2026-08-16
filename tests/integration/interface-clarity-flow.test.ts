import { describe, expect, it } from "vitest";
import {
  completeNonPvpEncounter,
  createRun,
  runIdentityForEntrant,
  summarizeRunHistory,
} from "../../src/simulation/run";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  contestSceneInput,
  continueRunFromResult,
  historyCircuitFacts,
  toLegacyContestResult,
} from "../../src/scenes/runPresentation";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function scoredRun() {
  return createRun({
    runId: "clarity-circuit-run",
    seed: 7,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng: () => 0,
  });
}

describe("Feature 035 scored-circuit history retention (T021)", () => {
  it("bridges the resolved track into the legacy result for settlement", () => {
    let run = scoredRun();
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    const input = contestSceneInput(run, run.activeEncounter!.id);
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const legacy = toLegacyContestResult(result);
    expect(legacy.circuit).toEqual({ trackId: result.track.id, trackName: result.track.name });
  });

  it("retains display-only circuit evidence at settlement and projects its identity", () => {
    let run = scoredRun();
    for (let i = 0; i < 2; i += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    const input = contestSceneInput(run, run.activeEncounter!.id);
    // Give the upcoming scored PvP stage its world-tour region evidence.
    run = {
      ...run,
      stages: run.stages.map((stage, index) => (index === run.stageIndex ? { ...stage, regionId: "british-isles" } : stage)),
    };
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const continued = continueRunFromResult(run, input.encounterId, result, () => 0);

    const entry = [...continued.history].sort((a, b) => b.stagePosition - a.stagePosition)[0];
    expect(entry.pvpOutcome?.circuit).toEqual({
      trackId: result.track.id,
      trackName: result.track.name,
      regionId: "british-isles",
    });

    const summary = summarizeRunHistory(continued);
    const facts = historyCircuitFacts(summary[summary.length - 1]);
    expect(facts).not.toBeNull();
    expect(facts?.mode).toBe("scored");
    expect(facts?.trackName).toBe(result.track.name);
    expect(facts?.locationLabel).toBe("British Isles");
  });

  it("returns null circuit facts for history without circuit evidence", () => {
    expect(historyCircuitFacts({ encounterId: "e", stagePosition: 1, type: "pvp", transactions: [] })).toBeNull();
  });
});
