import { describe, expect, it } from "vitest";
import { declineReward, chooseEncounter, type RewardDraftPayload } from "../../src/simulation/encounters";
import { createRun, RunTransitionError, runIdentityForEntrant } from "../../src/simulation/run";
import { prepareTestDayControlVisible } from "../../src/scenes/practicePresentation";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

/**
 * Feature 032 T003: pinned regressions for the hosted-demo defect log
 * (`specs/DEMO-BUGS.md`). Every case here must stay green for the whole
 * feature — later tasks extend this file, never loosen these pins.
 */

const create = (rng: () => number = () => 0) =>
  createRun({
    runId: "demo-regressions-run",
    seed: 7,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng,
  });

/** firstRoll 0.34 lands the encounter choice on `reward-draft`. */
function activateRewardDraft() {
  const run = create(() => 0.34);
  const choice = run.availableChoices[0];
  const active = chooseEncounter(run, choice.id, () => 0);
  expect(active.activeEncounter?.type).toBe("reward-draft");
  return active;
}

describe("DEMO-001 — Reward Draft Test Day return mismatch", () => {
  it("hides the Test Day control on Reward Draft only (temporary guard)", () => {
    expect(prepareTestDayControlVisible("reward-draft")).toBe(false);
  });

  it("keeps Test Day available from every other preparation surface", () => {
    expect(prepareTestDayControlVisible("parts-supplier")).toBe(true);
    expect(prepareTestDayControlVisible("cross-pollination")).toBe(true);
    expect(prepareTestDayControlVisible("sponsor-meeting")).toBe(true);
  });

  it("hiding Test Day never mutates the draft: offers and selection survive", () => {
    const active = activateRewardDraft();
    const payload = active.activeEncounter!.payload as RewardDraftPayload;
    // The guard is presentation-only: the encounter payload is untouched.
    expect(payload.offers).toHaveLength(3);
    expect(payload.selection).toBeNull();
    expect(active.build).toEqual(create(() => 0.34).build);
  });
});

describe("DEMO-002 — Reward Draft skip semantics", () => {
  it("the skip path accepts no offer and leaves build, storage, and credits unchanged", () => {
    const active = activateRewardDraft();
    const before = {
      build: structuredClone(active.build),
      credits: active.credits,
      transactions: active.creditTransactions.length,
    };

    const skipped = declineReward(active, active.activeEncounter!.id);

    expect(skipped.build).toEqual(before.build);
    expect(skipped.credits).toBe(before.credits);
    expect(skipped.creditTransactions).toHaveLength(before.transactions);
    expect(skipped.history[skipped.history.length - 1].acquisitionOutcome).toEqual({
      kind: "declined",
    });
  });

  it("repeated or rapid activation completes the encounter no more than once", () => {
    const active = activateRewardDraft();
    const skipped = declineReward(active, active.activeEncounter!.id);

    expect(skipped.activeEncounter).toBeNull();
    expect(() => declineReward(skipped, active.activeEncounter!.id)).toThrowError(
      RunTransitionError,
    );
  });

  it("skipping advances the run so normal progression resumes", () => {
    const active = activateRewardDraft();
    const skipped = declineReward(active, active.activeEncounter!.id);

    expect(skipped.status).toBe("active");
    expect(skipped.stageIndex).toBeGreaterThan(active.stageIndex);
    expect(skipped.history).toHaveLength(active.history.length + 1);
  });
});
