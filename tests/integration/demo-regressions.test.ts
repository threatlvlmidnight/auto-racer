import { describe, expect, it } from "vitest";
import { declineReward, chooseEncounter, type RewardDraftPayload } from "../../src/simulation/encounters";
import { createRun, RunTransitionError, runIdentityForEntrant } from "../../src/simulation/run";
import { prepareTestDayControlVisible } from "../../src/scenes/practicePresentation";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { ROOK_ITEMS } from "../../src/content/items/rook";
import { resolveSynergyEffects } from "../../src/simulation/synergy";
import { resolveContest } from "../../src/simulation/contest";
import { buildPlaybackSchedule, frameStateAt } from "../../src/simulation/playback";
import { tagInspectionProjection } from "../../src/scenes/itemPresentation";
import { inventoryBoardModel } from "../../src/scenes/inventoryVisuals";
import { APPROVED_UI_CHROME_REGISTRY } from "../../src/scenes/uiChrome";

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

describe("Feature 032 authored item regressions", () => {
  it("keeps Variable-Pitch Propeller at +15% per other airflow item", () => {
    const item = ROOK_ITEMS.find((entry) => entry.id === "rook-variable-pitch-propeller")!;
    expect(item.synergyEffects?.[0].condition).toEqual({ kind: "linear-per-count", percentPerMatch: 15 });
  });

  it("keeps Test Mounts at exactly two Power and +50% self cornering", () => {
    const mounts = ROOK_ITEMS.find((entry) => entry.id === "rook-interchangeable-test-mounts")!;
    const powerA = { ...mounts, id: "power-a", installationCategory: "power" as const };
    const powerB = { ...mounts, id: "power-b", installationCategory: "power" as const };
    const build = vehicleBuild([mounts, powerA, powerB]);
    expect(resolveSynergyEffects(build).get(build.slots[0].slotId)?.appliedDeltaPercent.corneringSpeed).toBe(50);
  });
});

describe("Feature 032 presentation-only replay invariants (T103)", () => {
  it("keeps contest/result bytes unchanged across speed, inspection, inventory, and chrome projections", () => {
    const run = create();
    const result = resolveContest(run.build, { id: "replay-ghost", lapTime: 6 }, 8);
    const before = JSON.stringify(result);
    const schedule = buildPlaybackSchedule(result);
    frameStateAt(schedule, result, 0, -1);
    frameStateAt(schedule, result, Number.POSITIVE_INFINITY, -1);
    tagInspectionProjection("gearing", "Gearing", run.build);
    inventoryBoardModel(run.build);
    APPROVED_UI_CHROME_REGISTRY.regions.forEach((region) => {
      expect(region.sourceRect.width).toBeGreaterThan(0);
    });
    expect(JSON.stringify(result)).toBe(before);
  });
});
