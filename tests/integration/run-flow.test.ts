import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import { GHOST_POOL } from "../../src/content/rivals";
import { selectGhostRoster } from "../../src/simulation/rivals";
import {
  chooseEncounter,
  purchaseStock,
  selectSponsorOption,
  type PartsSupplierPayload,
  type SponsorMeetingPayload,
} from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  completeNonPvpEncounter,
  completePvpEncounter,
  createUnavailableRun,
  createRun,
  runIdentityForEntrant,
  RunTransitionError,
} from "../../src/simulation/run";
import {
  activeEncounterPresentation,
  contestSceneInput,
  continueRunFromResult,
  raceLapLabel,
  runPresentation,
  runRoute,
} from "../../src/scenes/runPresentation";
import {
  createPracticeReturnContext,
  createPracticeSession,
  resolvePractice,
} from "../../src/simulation/practice";
import { runHubPracticeFixture } from "../fixtures/practice-run-fixtures";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const create = () =>
  createRun({
    runId: "integration-run",
    seed: 17,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng: (() => {
      const values = [0, 0.9];
      let index = 0;
      return () => values[index++ % values.length];
    })(),
  });

describe("run scene boundary", () => {
  it("keeps practice results structurally separate from scored continuation", () => {
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const practice = resolvePractice(createPracticeSession(fixture.run, context));

    expect(practice.result?.authority).toBe("practice-only");
    expect(practice.result).not.toHaveProperty("run");
    expect(practice.result).not.toHaveProperty("encounterId");
    expect(practice.result).not.toHaveProperty("creditTransactions");
  });

  it("presents stored choices and routes the selected encounter without regenerating them", () => {
    const run = create();
    const model = runPresentation(run);

    expect(model.progressLabel).toBe("Stage 1 of 12");
    expect(model.creditsLabel).toBe("5 credits");
    expect(model.choices.map(({ id }) => id)).toEqual(run.availableChoices.map(({ id }) => id));
    expect(runRoute(run)).toBe("RunScene");

    const selected = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
    expect(runRoute(selected)).toBe(
      selected.activeEncounter?.type === "sponsor-meeting" ? "RunScene" : "PrepareScene",
    );
    expect(selected.stageIndex).toBe(0);
    expect(selected.build).toEqual(run.build);
  });

  it("carries PvP context through one guarded result continuation with explicit labels", () => {
    let run = create();
    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    const input = contestSceneInput(run, run.activeEncounter!.id);
    const result = resolveContest(input.build, input.rivalRoster, input.level, input.seed, input.lapCount);
    const continued = continueRunFromResult(run, input.encounterId, result, () => 0);

    expect(input).toMatchObject({ encounterId: run.activeEncounter!.id, lapCount: 10, level: 1 });
    expect(input.rivalRoster).toHaveLength(7);
    expect(result.lapCount).toBe(10);
    expect(result.cars).toHaveLength(8);
    expect(raceLapLabel("PLAYER", { lapIndex: 9, lapProgress: 0.5, finished: false }, 10))
      .toBe("PLAYER · LAP 10/10");
    expect(raceLapLabel("GHOST", { lapIndex: 11, lapProgress: 0.5, finished: false }, 12))
      .toBe("GHOST · LAP 12/12");
    expect(continued.stageIndex).toBe(3);
    expect(continued.history).toHaveLength(3);
    expect(() => continueRunFromResult(continued, input.encounterId, result, () => 0))
      .toThrowError(RunTransitionError);
  });

  it("plays a full 12-stage run start to finish, ending on the 4th PvP stage (017-season-structure-grow US1)", () => {
    // A slow ghost via the legacy 2-car resolveContest guarantees a win at
    // every stage, keeping this structural test independent of the
    // 015-economy-depth reputation table (which a real 8-car field result
    // could otherwise fail the run against, before all 12 stages are seen).
    const slowGhost = { id: "slow-ghost", lapTime: 1000 };
    let run = create();
    expect(run.stages).toHaveLength(12);

    for (let pvpCount = 0; pvpCount < 4; pvpCount += 1) {
      for (let stage = 0; stage < 2; stage += 1) {
        run = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
        run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      }
      const lapCount = run.stages[run.stageIndex].lapCount!;
      const result = resolveContest(run.build, slowGhost, lapCount);
      if (pvpCount < 3) expect(run.status).toBe("active");
      run = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    }

    expect(run.status).toBe("completed");
    expect(run.stageIndex).toBe(12);
    expect(run.history).toHaveLength(12);
    expect(run.history.filter((entry) => entry.type === "pvp")).toHaveLength(4);
  });

  it("wires the current PvP stage's ordinal through to contestSceneInput's level (US3, FR-004)", () => {
    let run = create();
    const advanceThroughTwoChoices = () => {
      for (let stage = 0; stage < 2; stage += 1) {
        run = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
        run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      }
    };

    advanceThroughTwoChoices();
    const firstInput = contestSceneInput(run, run.activeEncounter!.id);
    expect(firstInput.level).toBe(1);
    const firstResult = resolveContest(
      firstInput.build,
      firstInput.rivalRoster,
      firstInput.level,
      firstInput.seed,
      firstInput.lapCount,
    );
    run = continueRunFromResult(run, firstInput.encounterId, firstResult, () => 0);

    advanceThroughTwoChoices();
    const secondInput = contestSceneInput(run, run.activeEncounter!.id);
    expect(secondInput.level).toBe(2);
  });

  it("populates rivalRoster from selectGhostRoster(GHOST_POOL, run.seed, level), not a fixed direct reference (019-async-ghost-pool T011)", () => {
    let run = create();
    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    const input = contestSceneInput(run, run.activeEncounter!.id);

    expect(input.rivalRoster).toEqual(selectGhostRoster(GHOST_POOL, run.seed, input.level));
  });

  it("keeps encounter selection separate from acquisition and exposes Supplier economy state", () => {
    const run = createRun({
      runId: "supplier-run",
      seed: 17,
      identityTag: "performance",
      identity: runIdentityForEntrant("evelyn-mercer")!,
      build: vehicleBuild(),
      rng: () => 0,
    });
    const active = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const before = activeEncounterPresentation(active);

    expect(active.build).toEqual(run.build);
    expect(active.creditTransactions).toEqual([]);
    expect(before).toMatchObject({
      type: "parts-supplier",
      credits: 5,
      restockCost: 1,
      restockAvailable: true,
    });
    expect(before?.stock).toHaveLength(3);
    expect(before?.stock?.[0]).toMatchObject({
      id: payload.stock[0].id,
      price: payload.stock[0].item.price,
      affordable: true,
      purchased: false,
    });

    const purchased = purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    expect(activeEncounterPresentation(purchased)?.stock?.[0].purchased).toBe(true);
    expect(purchased.build.slots[0].item).toEqual(payload.stock[0].item);
    expect(purchased.creditTransactions).toHaveLength(1);
  });

  it("exposes exact Sponsor payouts, targets, and tagged requirements", () => {
    const run = createRun({
      runId: "sponsor-run",
      seed: 17,
      identityTag: "performance",
      identity: runIdentityForEntrant("evelyn-mercer")!,
      build: vehicleBuild(),
      rng: () => 0.99,
    });
    const active = chooseEncounter(run, run.availableChoices[0].id, () => 0.5, ITEM_POOL);
    const model = activeEncounterPresentation(active);

    expect(model).toMatchObject({ type: "sponsor-meeting", credits: 5 });
    expect(model?.sponsorOptions?.[0]).toMatchObject({ payout: 2, kind: "immediate" });
    expect(model?.sponsorOptions?.slice(1).every(({ payout }) => payout === 7)).toBe(true);
    expect(model?.sponsorOptions?.some(({ targetSeconds }) => Number.isInteger(targetSeconds))).toBe(true);
    expect(model?.sponsorOptions?.some(({ requiredEvents }) => requiredEvents === 10)).toBe(true);

    const payload = active.activeEncounter!.payload as SponsorMeetingPayload;
    const conditional = selectSponsorOption(
      active,
      active.activeEncounter!.id,
      payload.options[1].id,
    );
    expect(runPresentation(conditional).pendingSponsorLabel).toContain("7 credits");
    expect(runPresentation(conditional).pendingSponsorLabel).toContain("next race");
  });

  it("presents available, active, completed, failed, and unavailable states without silent regeneration", () => {
    const available = create();
    const active = chooseEncounter(available, available.availableChoices[0].id, () => 0, ITEM_POOL);
    const completed = {
      ...available,
      status: "completed" as const,
      stageIndex: 12,
      availableChoices: [],
      activeEncounter: null,
      stages: available.stages.map((stage) => ({ ...stage, state: "completed" as const })),
    };
    const failed = {
      ...available,
      status: "failed" as const,
      reputation: 0,
      stageIndex: 3,
      availableChoices: [],
      activeEncounter: null,
    };
    const unavailable = createUnavailableRun({
      runId: "missing-context",
      seed: 0,
      identityTag: "performance",
      identity: runIdentityForEntrant("evelyn-mercer")!,
      build: available.build,
    });

    expect(runPresentation(available).statusLabel).toBe("Available");
    expect(runPresentation(active).statusLabel).toBe("Active");
    expect(runPresentation(completed).statusLabel).toBe("Completed");
    expect(runPresentation(failed).statusLabel).toBe("Failed");
    expect(runPresentation(failed).progressLabel).not.toContain("Stage");
    expect(runPresentation(unavailable)).toMatchObject({
      statusLabel: "Unavailable",
      choices: [],
      history: [],
    });
    expect(unavailable.availableChoices).toEqual([]);
  });

  it("always exposes the run's current reputation as its own presentation field (015-economy-depth FR-006)", () => {
    const run = create();
    expect(runPresentation(run).reputationLabel).toContain(String(run.reputation));
  });
});