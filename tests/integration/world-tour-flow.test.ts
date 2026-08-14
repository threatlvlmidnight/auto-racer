import { describe, expect, it } from "vitest";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  completeNonPvpEncounter,
  completePvpEncounter,
  confirmRunDestination,
  createRunForEntrant,
  type Run,
} from "../../src/simulation/run";

function newRun(): Run {
  const result = createRunForEntrant({ entrantId: "evelyn-mercer", runId: "world-flow", seed: 1901, rng: () => 0 });
  if (result.kind !== "created") throw new Error("run creation failed");
  return result.run;
}

function completeCurrentLeg(run: Run): Run {
  let current = run;
  const legEnd = current.stages.length;
  while (current.stageIndex < legEnd) {
    const stage = current.stages[current.stageIndex];
    if (stage.kind === "choice") {
      current = chooseEncounter(current, current.availableChoices[0].id, () => 0);
      current = completeNonPvpEncounter(current, current.activeEncounter!.id, { build: current.build }, () => 0);
    } else {
      const result = resolveContest(current.build, { id: "slow", lapTime: 100 }, stage.lapCount!);
      current = completePvpEncounter(current, current.activeEncounter!.id, result, () => 0);
    }
  }
  return current;
}

function completeTour(): Run {
  let run = newRun();
  for (let regionalLeg = 0; regionalLeg < 4; regionalLeg += 1) {
    run = confirmRunDestination(run, run.worldTour!.destinationOffer!.options[0], () => 0);
    run = completeCurrentLeg(run);
  }
  return completeCurrentLeg(run);
}

describe("world-tour run flow", () => {
  it("replaces the legacy schedule only on confirmed travel and pauses after a leg", () => {
    const initial = newRun();
    const offer = initial.worldTour!.destinationOffer!;
    expect(initial.stages).toHaveLength(12);

    let run = confirmRunDestination(initial, offer.options[0], () => 0);
    expect(run.stages).toHaveLength(8);
    expect(run.stages.map((stage) => stage.kind)).toEqual([
      "choice", "pvp", "choice", "pvp", "choice", "pvp", "choice", "pvp",
    ]);
    expect(run.stages.filter((stage) => stage.kind === "pvp").map((stage) => [stage.raceKind, stage.lapCount]))
      .toEqual([["local", 8], ["championship", 10], ["local", 8], ["championship", 10]]);

    run = completeCurrentLeg(run);
    expect(run.status).toBe("active");
    expect(run.stageIndex).toBe(8);
    expect(run.worldTour).toMatchObject({ phase: "awaiting-destination", currentGlobalStageIndex: 8 });
    expect(run.availableChoices).toEqual([]);

    run = confirmRunDestination(run, run.worldTour!.destinationOffer!.options[0], () => 0);
    expect(run.stages).toHaveLength(16);
    expect(run.stageIndex).toBe(8);
    expect(run.availableChoices).toHaveLength(2);
  });

  it("completes four chosen regions and automatic Paris only after all 40 stages", () => {
    const run = completeTour();
    expect(run.status).toBe("completed");
    expect(run.stageIndex).toBe(40);
    expect(run.history).toHaveLength(40);
    expect(run.worldTour).toMatchObject({ phase: "completed", currentGlobalStageIndex: 40 });
  });

  it("replays the same complete route deeply identically for the same seed and choices", () => {
    expect(completeTour()).toEqual(completeTour());
  });

  it("grants one race-bound Last Chance, consumes it on recovery, then fails at the next zero", () => {
    const initial = newRun();
    let run = confirmRunDestination(initial, initial.worldTour!.destinationOffer!.options[0], () => 0);
    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    run = { ...run, reputation: 1 };
    const localLoss = resolveContest(run.build, { id: "fast", lapTime: 0.1 }, run.stages[run.stageIndex].lapCount!);
    run = completePvpEncounter(run, run.activeEncounter!.id, localLoss, () => 0);
    expect(run).toMatchObject({ status: "active", reputation: 0, worldTour: { lastChanceStatus: "active" } });

    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    const championshipWin = resolveContest(run.build, { id: "slow", lapTime: 100 }, run.stages[run.stageIndex].lapCount!);
    run = completePvpEncounter(run, run.activeEncounter!.id, championshipWin, () => 0);
    expect(run).toMatchObject({ status: "active", reputation: 3, worldTour: { lastChanceStatus: "consumed" } });

    run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    run = { ...run, reputation: 1 };
    const secondLoss = resolveContest(run.build, { id: "fast", lapTime: 0.1 }, run.stages[run.stageIndex].lapCount!);
    run = completePvpEncounter(run, run.activeEncounter!.id, secondLoss, () => 0);
    expect(run).toMatchObject({ status: "failed", reputation: 0, worldTour: { lastChanceStatus: "failed" } });
  });
});
