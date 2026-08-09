import { describe, expect, it } from "vitest";
import {
  captureProtectedRunState,
  protectedRunStateEquals,
} from "../../src/simulation/practice";
import type { Run } from "../../src/simulation/run";
import {
  pvpBriefingPracticeFixture,
  rewardDraftPracticeFixture,
  supplierPracticeFixture,
} from "../fixtures/practice-run-fixtures";

describe("protected run state", () => {
  it.each([
    supplierPracticeFixture,
    rewardDraftPracticeFixture,
    pvpBriefingPracticeFixture,
  ])("captures the complete named projection and whole-run backstop", (fixtureFactory) => {
    const run = fixtureFactory().run;
    const protectedState = captureProtectedRunState(run);

    expect(protectedState).toMatchObject({
      runId: run.id,
      seed: run.seed,
      status: run.status,
      stageIndex: run.stageIndex,
      stages: run.stages,
      availableChoices: run.availableChoices,
      activeEncounter: run.activeEncounter,
      credits: run.credits,
      creditTransactions: run.creditTransactions,
      sponsor: run.activeSponsorContract,
      build: run.build,
      history: run.history,
      scoredResultCount: run.history.filter((entry) => entry.pvpOutcome).length,
    });
    expect(protectedState.wholeRun).toStrictEqual(run);
    expect(protectedState.wholeRun).not.toBe(run);
    expect(protectedRunStateEquals(protectedState, run)).toBe(true);
  });

  it("detects independent mutation of every protected field family", () => {
    const original = supplierPracticeFixture().run;
    const protectedState = captureProtectedRunState(original);
    const mutations: Array<(run: Run) => void> = [
      (run) => { run.id = "changed"; },
      (run) => { run.seed += 1; },
      (run) => { run.status = "completed"; },
      (run) => { run.stageIndex += 1; },
      (run) => { run.stages[0].state = "completed"; },
      (run) => { run.availableChoices.reverse(); },
      (run) => { run.activeEncounter!.id = "changed"; },
      (run) => { (run.activeEncounter!.payload as unknown as { restockUsed: boolean }).restockUsed = false; },
      (run) => { (run.activeEncounter!.payload as unknown as { stock: unknown[] }).stock.reverse(); },
      (run) => { run.credits += 1; },
      (run) => { run.creditTransactions[0].amount += 1; },
      (run) => { run.activeSponsorContract!.status = "failed"; },
      (run) => { run.build.slots.reverse(); },
      (run) => { run.build.storage[0] = { index: 0, item: run.build.slots[0].item }; },
      (run) => { run.history[0].pvpOutcome!.gap += 1; },
    ];

    mutations.forEach((mutate) => {
      const changed = structuredClone(original);
      mutate(changed);
      expect(changed).not.toStrictEqual(protectedState.wholeRun);
      expect(protectedRunStateEquals(protectedState, changed)).toBe(false);
      expect(captureProtectedRunState(changed)).not.toStrictEqual(protectedState);
    });
  });
});