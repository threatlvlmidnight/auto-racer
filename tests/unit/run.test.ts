import { describe, expect, it } from "vitest";
import { BASELINE_CAR, SAMPLE_GHOST } from "../../src/content/sample-data";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  applyRaceReputationChange,
  applySponsorFailurePenalty,
  completePvpEncounter,
  completeNonPvpEncounter,
  createUnavailableRun,
  createRun,
  interestFor,
  reputationDeltaForPosition,
  runProgress,
  RunTransitionError,
  summarizeRunHistory,
  type Run,
} from "../../src/simulation/run";
import type { ContestResult, EntrantId, RunIdentity, VehicleBuild } from "../../src/simulation/types";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
import { commitSetupMemory, initialSetupSelections } from "../../src/simulation/raceSetup";
import {
  canEnterEntrantSelection,
  createRunForEntrant,
  runIdentityForEntrant,
  validateRunBuildContext,
} from "../../src/simulation/run";

const TEST_IDENTITY: RunIdentity = runIdentityForEntrant("evelyn-mercer")!;

const emptyBuild = (): VehicleBuild => createEmptyVehicleBuild(TEST_IDENTITY.vehicleId);

const sequenceRng = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const newRun = (): Run =>
  createRun({
    runId: "run-001",
    seed: 42,
    identityTag: "performance",
    identity: TEST_IDENTITY,
    build: emptyBuild(),
    rng: sequenceRng(0, 0.9),
  });

function advanceToFirstPvp(run = newRun()): Run {
  let current = run;
  for (let stage = 0; stage < 2; stage += 1) {
    current = chooseEncounter(current, current.availableChoices[0].id, () => 0);
    current = completeNonPvpEncounter(
      current,
      current.activeEncounter!.id,
      { build: current.build },
      sequenceRng(0, 0.9),
    );
  }
  return current;
}

describe("createRun", () => {
  it("stores identity, starting economy, schedule, stable IDs, and initial choices", () => {
    const run = newRun();

    expect(run).toMatchObject({
      id: "run-001",
      seed: 42,
      identityTag: "performance",
      status: "active",
      stageIndex: 0,
      credits: 5,
      history: [],
    });
    expect(run.stages.map(({ id, kind, lapCount }) => ({ id, kind, lapCount }))).toEqual([
      { id: "run-001-stage-1", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-2", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-3", kind: "pvp", lapCount: 10 },
      { id: "run-001-stage-4", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-5", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-6", kind: "pvp", lapCount: 12 },
      { id: "run-001-stage-7", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-8", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-9", kind: "pvp", lapCount: 14 },
      { id: "run-001-stage-10", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-11", kind: "choice", lapCount: undefined },
      { id: "run-001-stage-12", kind: "pvp", lapCount: 16 },
    ]);
    expect(run.availableChoices).toHaveLength(2);
    expect(new Set(run.availableChoices.map((choice) => choice.type)).size).toBe(2);
  });
});

describe("12-stage schedule (017-season-structure-grow US1, FR-001/FR-002/FR-003)", () => {
  it("produces exactly 12 stages in the fixed [choice, choice, pvp] x4 order", () => {
    const run = newRun();
    expect(run.stages).toHaveLength(12);
    expect(run.stages.map((stage) => stage.kind)).toEqual([
      "choice", "choice", "pvp",
      "choice", "choice", "pvp",
      "choice", "choice", "pvp",
      "choice", "choice", "pvp",
    ]);
  });

  it("assigns choiceOrdinal 1-8 across the 8 choice stages, in order", () => {
    const run = newRun();
    expect(run.stages.filter((stage) => stage.kind === "choice").map((stage) => stage.choiceOrdinal))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("assigns pvpOrdinal 1-4 (the widened type) and a defined lapCount to every pvp stage", () => {
    const run = newRun();
    const pvpStages = run.stages.filter((stage) => stage.kind === "pvp");
    expect(pvpStages.map((stage) => stage.pvpOrdinal)).toEqual([1, 2, 3, 4]);
    expect(pvpStages.every((stage) => typeof stage.lapCount === "number")).toBe(true);
    // Widened lapCount union (10 | 12 | 14 | 16) — a type-level check via
    // assignability, exercised at runtime against the authored values.
    expect(pvpStages.map((stage) => stage.lapCount)).toEqual([10, 12, 14, 16]);
  });

  it("only the final (12th) stage is a pvp stage that ends the schedule", () => {
    const run = newRun();
    expect(run.stages[11].kind).toBe("pvp");
    expect(run.stages[11].pvpOrdinal).toBe(4);
  });

  it("generateEncounterChoices offers only the three existing non-PvP encounter types at every one of the 8 choice stages", () => {
    let run = newRun();
    const seenTypes = new Set<string>();
    for (let choiceCount = 0; choiceCount < 8; choiceCount += 1) {
      run.availableChoices.forEach((choice) => seenTypes.add(choice.type));
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      if (run.stages[run.stageIndex]?.kind === "pvp") {
        const result = resolveContest(run.build, { id: "slow-ghost", lapTime: 100 }, run.stages[run.stageIndex].lapCount!);
        run = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
      }
    }
    expect([...seenTypes].every((type) =>
      type === "parts-supplier" || type === "reward-draft" || type === "sponsor-meeting")).toBe(true);
  });

  it("advanceRun reaches \"completed\" only after the 12th stage resolves, not at the old 6-stage boundary", () => {
    const slowGhost = { id: "slow-ghost", lapTime: 100 };
    let run = newRun();
    for (let pvpCount = 0; pvpCount < 4; pvpCount += 1) {
      for (let stage = 0; stage < 2; stage += 1) {
        run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
        run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      }
      const lapCount = run.stages[run.stageIndex].lapCount!;
      const result = resolveContest(run.build, slowGhost, lapCount);
      if (pvpCount < 3) {
        expect(run.status).toBe("active");
      }
      run = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    }
    expect(run.status).toBe("completed");
    expect(run.stageIndex).toBe(12);
    expect(run.history).toHaveLength(12);
  });
});

describe("non-PvP run transitions", () => {
  it("activates one stored choice without selecting an item", () => {
    const run = newRun();
    const choice = run.availableChoices[0];
    const active = chooseEncounter(run, choice.id, sequenceRng(0.1, 0.8));

    expect(active.activeEncounter).toMatchObject({
      id: `${choice.id}-encounter`,
      stageId: run.stages[0].id,
      type: choice.type,
      status: "active",
    });
    expect(active.stageIndex).toBe(0);
    expect(active.build).toEqual(run.build);
    expect(run.activeEncounter).toBeNull();
  });

  it("completes exactly once, appends history, preserves build, and advances one stage", () => {
    const run = newRun();
    const active = chooseEncounter(run, run.availableChoices[0].id, () => 0);
    const snapshot = structuredClone(active);
    const completed = completeNonPvpEncounter(
      active,
      active.activeEncounter!.id,
      { build: active.build, acquisitionOutcome: { kind: "declined" } },
      sequenceRng(0.2, 0.9),
    );

    expect(active).toEqual(snapshot);
    expect(completed.stageIndex).toBe(1);
    expect(completed.history).toHaveLength(1);
    expect(completed.history[0]).toMatchObject({
      encounterId: active.activeEncounter!.id,
      stagePosition: 1,
      type: active.activeEncounter!.type,
    });
    expect(completed.build).toEqual(active.build);
    expect(completed.availableChoices).toHaveLength(2);

    expect(() =>
      completeNonPvpEncounter(
        completed,
        active.activeEncounter!.id,
        { build: completed.build },
        () => 0,
      ),
    ).toThrowError(RunTransitionError);
  });

  it("rejects wrong choice and stale encounter IDs with typed codes", () => {
    const run = newRun();

    expect(() => chooseEncounter(run, "wrong-choice", () => 0)).toThrowError(
      expect.objectContaining({ code: "encounter-id-mismatch" }),
    );
    expect(() =>
      completeNonPvpEncounter(run, "stale-encounter", { build: run.build }, () => 0),
    ).toThrowError(expect.objectContaining({ code: "encounter-id-mismatch" }));
  });

  it("rejects generic completion at a scheduled PvP stage", () => {
    let run = newRun();
    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = completeNonPvpEncounter(
        run,
        run.activeEncounter!.id,
        { build: run.build },
        sequenceRng(0, 0.9),
      );
    }

    expect(run.stages[run.stageIndex].kind).toBe("pvp");
    expect(() =>
      completeNonPvpEncounter(
        run,
        run.stages[run.stageIndex].id,
        { build: run.build },
        () => 0,
      ),
    ).toThrowError(expect.objectContaining({ code: "invalid-encounter-type" }));
  });
});

describe("PvP run transitions", () => {
  it.each([
    ["win", 7, 4],
    ["tie", BASELINE_CAR.baseLapTime, 2],
    ["loss", SAMPLE_GHOST.lapTime, 2],
  ] as const)("settles a %s with ordered purses and immutable build", (_outcome, ghostLapTime, payout) => {
    const active = advanceToFirstPvp();
    const snapshot = structuredClone(active);
    const result = resolveContest(active.build, { id: "fixture-ghost", lapTime: ghostLapTime }, 10);
    const completed = completePvpEncounter(active, active.activeEncounter!.id, result, () => 0);

    expect(active).toEqual(snapshot);
    expect(completed.build).toEqual(active.build);
    expect(completed.credits).toBe(active.credits + payout);
    expect(completed.creditTransactions.slice(-2).map(({ kind }) => kind)).toEqual(
      payout === 4 ? ["participation", "win-bonus"] : ["participation"],
    );
    expect(completed.history[completed.history.length - 1]).toMatchObject({
      encounterId: active.activeEncounter!.id,
      stagePosition: 3,
      type: "pvp",
      pvpOutcome: {
        outcome: result.outcome,
        lapCount: 10,
      },
    });
  });

  it.each([
    ["lap count", (result: ContestResult) => ({ ...result, lapCount: 12 })],
    ["board IDs", (result: ContestResult) => ({ ...result, board: [LEGACY_ITEM_POOL[0]] })],
    ["storage IDs", (result: ContestResult) => ({ ...result, storage: [LEGACY_ITEM_POOL[0]] })],
  ])("rejects mismatched %s before any mutation", (_label, mutate) => {
    const active = advanceToFirstPvp();
    const snapshot = structuredClone(active);
    const mismatched = mutate(resolveContest(active.build, SAMPLE_GHOST, 10));

    expect(() => completePvpEncounter(active, active.activeEncounter!.id, mismatched, () => 0))
      .toThrowError(expect.objectContaining({ code: "race-result-mismatch" }));
    expect(active).toEqual(snapshot);
  });

  it("rejects stale and duplicate IDs and completes the final PvP exactly once", () => {
    // Uses a slow ghost rather than SAMPLE_GHOST so both PvP stages resolve
    // as wins, keeping reputation clear of the failure floor — this test
    // exercises ID handling, not the 015-economy-depth reputation table.
    const slowGhost = { id: "slow-ghost", lapTime: 100 };
    let run = advanceToFirstPvp();
    const firstId = run.activeEncounter!.id;
    const firstResult = resolveContest(run.build, slowGhost, 10);
    expect(() => completePvpEncounter(run, "wrong-id", firstResult, () => 0)).toThrowError(
      expect.objectContaining({ code: "encounter-id-mismatch" }),
    );
    run = completePvpEncounter(run, firstId, firstResult, () => 0);
    expect(() => completePvpEncounter(run, firstId, firstResult, () => 0)).toThrowError(
      RunTransitionError,
    );

    // Play through the remaining 3 PvP stages (of 4 total in the
    // 12-stage schedule — 017-season-structure-grow) to reach the real
    // final PvP, not the old 6-stage schedule's second one.
    let finalId = "";
    for (let pvpCount = 0; pvpCount < 3; pvpCount += 1) {
      for (let stage = 0; stage < 2; stage += 1) {
        run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
        run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      }
      finalId = run.activeEncounter!.id;
      const lapCount = run.stages[run.stageIndex].lapCount!;
      run = completePvpEncounter(run, finalId, resolveContest(run.build, slowGhost, lapCount), () => 0);
    }

    expect(run.status).toBe("completed");
    expect(run.stageIndex).toBe(12);
    expect(run.history).toHaveLength(12);
    expect(() => completePvpEncounter(run, finalId, resolveContest(run.build, SAMPLE_GHOST, 16)))
      .toThrowError(expect.objectContaining({ code: "run-not-active" }));
  });
});

describe("run status and summaries", () => {
  it("summarizes chronological acquisition, credits, PvP, and sponsor details", () => {
    const base = newRun();
    const detailed: Run = {
      ...base,
      status: "completed",
      stageIndex: 12,
      credits: 9,
      creditTransactions: [
        { id: "purchase", encounterId: "supplier", kind: "purchase", amount: -2, balanceAfter: 3 },
        { id: "purse", encounterId: "pvp", kind: "participation", amount: 2, balanceAfter: 5 },
        { id: "sponsor", encounterId: "pvp", kind: "sponsor-conditional", amount: 7, balanceAfter: 12 },
      ],
      history: [
        {
          encounterId: "supplier",
          stagePosition: 1,
          type: "parts-supplier",
          acquisitionOutcome: { kind: "purchased", itemIds: ["item-001"], restocked: true },
          creditTransactionIds: ["purchase"],
        },
        {
          encounterId: "pvp",
          stagePosition: 3,
          type: "pvp",
          creditTransactionIds: ["purse", "sponsor"],
          pvpOutcome: {
            outcome: "win",
            lapCount: 10,
            playerTime: 55,
            ghostTime: 58.5,
            gap: -3.5,
          },
          sponsorOutcome: {
            id: "contract",
            sourceEncounterId: "meeting",
            objective: { kind: "trigger-tagged-items", tag: "momentum", requiredEvents: 10 },
            payout: 7,
            status: "succeeded",
            resolvedEncounterId: "pvp",
            actual: 12,
          },
        },
      ],
    };
    const summary = summarizeRunHistory(detailed);

    expect(summary.map(({ stagePosition }) => stagePosition)).toEqual([1, 3]);
    expect(summary[0]).toMatchObject({
      type: "parts-supplier",
      acquisition: { kind: "purchased", itemIds: ["item-001"], restocked: true },
      transactions: [{ kind: "purchase", amount: -2, balanceAfter: 3 }],
    });
    expect(summary[1]).toMatchObject({
      pvp: { outcome: "win", lapCount: 10, gap: -3.5 },
      sponsor: {
        kind: "trigger-tagged-items",
        status: "succeeded",
        actual: 12,
        required: 10,
        payout: 7,
      },
    });
    expect(runProgress(detailed)).toEqual({ current: 12, total: 12, remaining: 0, status: "completed" });
  });

  it("constructs unavailable state without choices and creates a clean capacity-preserving reset", () => {
    const unavailable = createUnavailableRun({
      runId: "unavailable",
      seed: 0,
      identityTag: "performance",
      identity: TEST_IDENTITY,
      build: emptyBuild(),
    });
    const fresh = createRun({
      runId: "fresh",
      seed: 1,
      identityTag: "performance",
      identity: TEST_IDENTITY,
      build: emptyBuild(),
      rng: () => 0,
    });

    expect(unavailable).toMatchObject({
      status: "unavailable",
      availableChoices: [],
      activeEncounter: null,
      history: [],
    });
    expect(fresh).toMatchObject({ status: "active", stageIndex: 0, credits: 5, history: [] });
    expect(fresh.build.slots).toHaveLength(4);
    expect(fresh.build.storage).toHaveLength(3);
    const completed = { ...fresh, status: "completed" as const };
    expect(() => chooseEncounter(completed, completed.availableChoices[0].id, () => 0))
      .toThrowError(expect.objectContaining({ code: "run-not-active" }));
  });
});
describe("VehicleBuild construction (feature 010 migration)", () => {
  it("builds an empty four-slot topology matching the authored vehicle", () => {
    const build = createEmptyVehicleBuild("the-highwheel");

    expect(build.vehicleId).toBe("the-highwheel");
    expect(build.car).toStrictEqual(BASELINE_CAR);
    expect(build.slots).toHaveLength(4);
    expect(build.slots.map((slot) => slot.slotType)).toEqual(["power", "chassis", "chassis", "flex"]);
    build.slots.forEach((slot) => expect(slot.item).toBeNull());
  });

  it("always creates exactly three indexed storage positions", () => {
    (["the-highwheel", "the-needle", "the-lark", "the-hush"] as const).forEach((vehicleId) => {
      const build = createEmptyVehicleBuild(vehicleId);
      expect(build.storage).toHaveLength(3);
      expect(build.storage.map((position) => position.index)).toEqual([0, 1, 2]);
      build.storage.forEach((position) => expect(position.item).toBeNull());
    });
  });

  it("gives every vehicle equal total active capacity despite different topologies", () => {
    const capacities = (["the-highwheel", "the-needle", "the-lark", "the-hush"] as const)
      .map((vehicleId) => createEmptyVehicleBuild(vehicleId).slots.length);
    expect(new Set(capacities)).toStrictEqual(new Set([4]));
  });

  it("preserves the authored slot IDs and order from the vehicle definition", () => {
    const build = createEmptyVehicleBuild("the-hush");
    expect(build.slots.map((slot) => slot.slotId)).toEqual([
      "the-hush-slot-1",
      "the-hush-slot-2",
      "the-hush-slot-3",
      "the-hush-slot-4",
    ]);
    expect(build.slots.map((slot) => slot.slotType)).toEqual(["power", "power", "chassis", "chassis"]);
  });
});

describe("validateRunBuildContext (feature 010 migration)", () => {
  it("accepts a valid identity paired with its matching empty build", () => {
    expect(validateRunBuildContext(TEST_IDENTITY, emptyBuild())).toStrictEqual({ kind: "valid" });
  });

  it("returns a typed unavailable result for a missing identity instead of guessing one", () => {
    expect(validateRunBuildContext(null, emptyBuild())).toStrictEqual({
      kind: "unavailable",
      code: "missing-run-identity",
    });
  });

  it("returns a typed unavailable result for a missing build instead of creating a default", () => {
    expect(validateRunBuildContext(TEST_IDENTITY, null)).toStrictEqual({
      kind: "unavailable",
      code: "invalid-build-context",
    });
  });

  it("rejects an identity whose entrant and vehicle are not a reciprocal pairing", () => {
    const mismatched: RunIdentity = { ...TEST_IDENTITY, vehicleId: "the-needle" };
    expect(validateRunBuildContext(mismatched, emptyBuild())).toStrictEqual({
      kind: "unavailable",
      code: "invalid-entrant-context",
    });
  });

  it("rejects an identity whose origin does not match its entrant definition", () => {
    const mismatched: RunIdentity = { ...TEST_IDENTITY, origin: "backroads" };
    expect(validateRunBuildContext(mismatched, emptyBuild())).toStrictEqual({
      kind: "unavailable",
      code: "invalid-entrant-context",
    });
  });

  it("rejects a build whose vehicle does not match the run identity", () => {
    expect(validateRunBuildContext(TEST_IDENTITY, createEmptyVehicleBuild("the-lark"))).toStrictEqual({
      kind: "unavailable",
      code: "invalid-build-context",
    });
  });

  it("rejects a build whose slot topology no longer matches the authored vehicle", () => {
    const build = emptyBuild();
    const tampered: VehicleBuild = { ...build, slots: build.slots.slice(0, 3) };
    expect(validateRunBuildContext(TEST_IDENTITY, tampered)).toStrictEqual({
      kind: "unavailable",
      code: "invalid-vehicle-topology",
    });
  });

  it("rejects a build whose slot types were reordered away from the authored topology", () => {
    const build = emptyBuild();
    const tampered: VehicleBuild = {
      ...build,
      slots: build.slots.map((slot, index) => (index === 0 ? { ...slot, slotType: "flex" as const } : slot)),
    };
    expect(validateRunBuildContext(TEST_IDENTITY, tampered)).toStrictEqual({
      kind: "unavailable",
      code: "invalid-vehicle-topology",
    });
  });

  it("rejects a build without exactly three storage positions", () => {
    const build = emptyBuild();
    const tampered: VehicleBuild = { ...build, storage: build.storage.slice(0, 2) };
    expect(validateRunBuildContext(TEST_IDENTITY, tampered)).toStrictEqual({
      kind: "unavailable",
      code: "invalid-vehicle-topology",
    });
  });

  it("rejects a build whose baseline car differs from the shared baseline", () => {
    const build = emptyBuild();
    const tampered: VehicleBuild = { ...build, car: { id: "faster-car", baseLapTime: 1 } };
    expect(validateRunBuildContext(TEST_IDENTITY, tampered)).toStrictEqual({
      kind: "unavailable",
      code: "invalid-build-context",
    });
  });

  it("routes stale legacy generic-board state to a typed unavailable result rather than migrating it silently", () => {
    const legacy = { car: BASELINE_CAR, board: [null, null, null], storage: [null, null, null] };
    expect(validateRunBuildContext(TEST_IDENTITY, legacy as unknown as VehicleBuild)).toStrictEqual({
      kind: "unavailable",
      code: "legacy-generic-board",
    });
  });
});

describe("canEnterEntrantSelection", () => {
  it("allows selection when there is no active run", () => {
    expect(canEnterEntrantSelection(null)).toStrictEqual({ kind: "allowed" });
  });

  it("blocks selection while a run is still active so a second run cannot be started", () => {
    expect(canEnterEntrantSelection(newRun())).toStrictEqual({
      kind: "blocked",
      code: "active-run-exists",
    });
  });

  it.each(["completed", "unavailable"] as const)(
    "allows selection once the existing run is %s",
    (status) => {
      expect(canEnterEntrantSelection({ ...newRun(), status })).toStrictEqual({ kind: "allowed" });
    },
  );
});

describe("createRunForEntrant", () => {
  const confirm = (entrantId: EntrantId, runId = "confirmed-run") =>
    createRunForEntrant({ entrantId, runId, seed: 99, rng: sequenceRng(0, 0.9) });

  it.each([
    ["evelyn-mercer", "the-highwheel", "coachworks"],
    ["lucien-soto", "the-needle", "velodrome"],
    ["inez-rook", "the-lark", "fieldworks"],
    ["nell-voss", "the-hush", "backroads"],
  ] as const)("creates a run for %s with its immutable identity and matching empty vehicle", (entrantId, vehicleId, origin) => {
    const result = confirm(entrantId);

    expect(result.kind).toBe("created");
    if (result.kind !== "created") return;
    expect(result.run.identity).toStrictEqual({
      entrantId,
      origin,
      vehicleId,
      topologyId: `${vehicleId}-topology-v1`,
    });
    expect(result.run.build.vehicleId).toBe(vehicleId);
    expect(result.run.build.slots).toHaveLength(4);
    expect(result.run.build.slots.every((slot) => slot.item === null)).toBe(true);
    expect(result.run.build.storage).toHaveLength(3);
    expect(result.run.build.storage.every((position) => position.item === null)).toBe(true);
  });

  it("starts every confirmed run with 5 credits, stage 1, the fixed twelve stages, and no history", () => {
    const result = confirm("lucien-soto");

    expect(result.kind).toBe("created");
    if (result.kind !== "created") return;
    expect(result.run).toMatchObject({
      status: "active",
      stageIndex: 0,
      credits: 5,
      history: [],
      creditTransactions: [],
      activeEncounter: null,
      activeSponsorContract: null,
    });
    expect(result.run.stages).toHaveLength(12);
    expect(result.run.stages.map((stage) => stage.kind)).toEqual([
      "choice", "choice", "pvp",
      "choice", "choice", "pvp",
      "choice", "choice", "pvp",
      "choice", "choice", "pvp",
    ]);
  });

  it("generates the opening encounter choices exactly once", () => {
    const result = confirm("inez-rook");

    expect(result.kind).toBe("created");
    if (result.kind !== "created") return;
    expect(result.run.availableChoices).toHaveLength(2);
    expect(new Set(result.run.availableChoices.map((choice) => choice.type)).size).toBe(2);
  });

  it("gives every entrant identical capacity and baseline — identity never buys an advantage", () => {
    const runs = (["evelyn-mercer", "lucien-soto", "inez-rook", "nell-voss"] as const)
      .map((entrantId) => confirm(entrantId))
      .filter((result): result is Extract<typeof result, { kind: "created" }> => result.kind === "created")
      .map((result) => result.run);

    expect(runs).toHaveLength(4);
    expect(new Set(runs.map((run) => run.build.slots.length))).toStrictEqual(new Set([4]));
    expect(new Set(runs.map((run) => run.build.storage.length))).toStrictEqual(new Set([3]));
    expect(new Set(runs.map((run) => run.credits))).toStrictEqual(new Set([5]));
    expect(new Set(runs.map((run) => run.build.car.baseLapTime))).toStrictEqual(new Set([BASELINE_CAR.baseLapTime]));
  });

  it("returns a typed validation failure for an unknown entrant instead of a default run", () => {
    const result = createRunForEntrant({
      entrantId: "nobody" as EntrantId,
      runId: "bad-run",
      seed: 1,
      rng: () => 0,
    });

    expect(result).toStrictEqual({ kind: "validation-failure", code: "entrant-unavailable" });
  });

  it("returns a typed validation failure rather than throwing for invalid initialization input", () => {
    expect(() => createRunForEntrant({
      entrantId: "" as EntrantId,
      runId: "bad-run",
      seed: 1,
      rng: () => 0,
    })).not.toThrow();
    expect(createRunForEntrant({
      entrantId: "" as EntrantId,
      runId: "bad-run",
      seed: 1,
      rng: () => 0,
    }).kind).toBe("validation-failure");
  });

  it("produces a run whose own identity/build context validates as consistent", () => {
    const result = confirm("nell-voss");

    expect(result.kind).toBe("created");
    if (result.kind !== "created") return;
    expect(validateRunBuildContext(result.run.identity, result.run.build)).toStrictEqual({ kind: "valid" });
  });

  it("is deterministic for the same entrant, run id, seed, and rng", () => {
    const first = createRunForEntrant({ entrantId: "evelyn-mercer", runId: "same", seed: 7, rng: sequenceRng(0, 0.9) });
    const second = createRunForEntrant({ entrantId: "evelyn-mercer", runId: "same", seed: 7, rng: sequenceRng(0, 0.9) });

    expect(first).toStrictEqual(second);
  });
});

describe("reputation and the \"failed\" RunStatus (015-economy-depth Foundational)", () => {
  it("starts every new run at a fixed, positive authored reputation value", () => {
    const run = newRun();

    expect(Number.isInteger(run.reputation)).toBe(true);
    expect(run.reputation).toBeGreaterThan(0);
  });

  it("ends the run with status \"failed\", not \"active\" or \"completed\", once reputation reaches zero via advanceRun", () => {
    const run = { ...advanceToFirstPvp(), reputation: 0 };
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);
    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);

    expect(completed.status).toBe("failed");
    expect(completed.activeEncounter).toBeNull();
    expect(completed.availableChoices).toEqual([]);
  });

  it("prioritizes \"failed\" over \"completed\" when reputation reaches zero on the same transition that finishes the final (12th) stage", () => {
    // 017-season-structure-grow: the schedule is now 12 stages (4 PvP
    // stages), so this coincidence can only genuinely occur at the real
    // final stage — wins the first 3 PvPs on a slow ghost to keep
    // reputation clear of the floor until forcing it to 0 right before
    // the 4th and final one.
    const slowGhost = { id: "slow-ghost", lapTime: 1000 };
    let run = advanceToFirstPvp();
    for (let pvpCount = 0; pvpCount < 3; pvpCount += 1) {
      const lapCount = run.stages[run.stageIndex].lapCount!;
      run = completePvpEncounter(run, run.activeEncounter!.id, resolveContest(run.build, slowGhost, lapCount), () => 0);
      for (let stage = 0; stage < 2; stage += 1) {
        run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
        run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
      }
    }
    run = { ...run, reputation: 0 };
    const finalLapCount = run.stages[run.stageIndex].lapCount!;
    const finalResult = resolveContest(run.build, SAMPLE_GHOST, finalLapCount);
    const finished = completePvpEncounter(run, run.activeEncounter!.id, finalResult, () => 0);

    expect(finished.status).toBe("failed");
    expect(finished.stageIndex).toBe(12);
  });

  it("preserves a failed run's history, credit transactions, and completed stages exactly as far as it got", () => {
    const run = { ...advanceToFirstPvp(), reputation: 0 };
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);
    const failed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);

    expect(failed.history).toHaveLength(3);
    expect(failed.history[2]).toMatchObject({ stagePosition: 3, type: "pvp" });
    expect(failed.creditTransactions.length).toBeGreaterThan(0);
    expect(failed.stages.slice(0, 3).every((stage) => stage.state === "completed")).toBe(true);
  });

  it("never returns a negative reputation from a run construction path", () => {
    expect(newRun().reputation).toBeGreaterThanOrEqual(0);
    expect(createUnavailableRun({
      runId: "unavailable",
      seed: 0,
      identityTag: "performance",
      identity: TEST_IDENTITY,
      build: emptyBuild(),
    }).reputation).toBeGreaterThanOrEqual(0);
  });
});

describe("reputationDeltaForPosition (015-economy-depth US1, position rescale)", () => {
  it("awards a decreasing bonus for each podium position", () => {
    expect(reputationDeltaForPosition(1)).toBe(3);
    expect(reputationDeltaForPosition(2)).toBe(2);
    expect(reputationDeltaForPosition(3)).toBe(1);
  });

  it("is neutral for 4th place", () => {
    expect(reputationDeltaForPosition(4)).toBe(0);
  });

  it("charges an increasing penalty for each back-of-field position", () => {
    expect(reputationDeltaForPosition(5)).toBe(-1);
    expect(reputationDeltaForPosition(6)).toBe(-2);
    expect(reputationDeltaForPosition(7)).toBe(-3);
    expect(reputationDeltaForPosition(8)).toBe(-4);
  });
});

describe("applyRaceReputationChange / applySponsorFailurePenalty (015-economy-depth US1, FR-002/FR-004)", () => {
  it("applies the position delta, up or down", () => {
    const run = newRun();

    expect(applyRaceReputationChange(run, 1).reputation).toBe(run.reputation + 3);
    expect(applyRaceReputationChange(run, 8).reputation).toBe(run.reputation - 4);
  });

  it("floors at exactly 0 and never goes negative", () => {
    const run = { ...newRun(), reputation: 0 };
    expect(applyRaceReputationChange(run, 8).reputation).toBe(0);
    expect(applySponsorFailurePenalty(run).reputation).toBe(0);
  });

  it("does not mutate the input run", () => {
    const run = newRun();
    const snapshot = structuredClone(run);
    applyRaceReputationChange(run, 8);
    applySponsorFailurePenalty(run);
    expect(run).toEqual(snapshot);
  });
});

describe("completePvpEncounter reputation wiring (US1, position rescale)", () => {
  it("applies the largest penalty on an outright PvP loss (legacy 2-car path maps loss to position 8)", () => {
    const run = advanceToFirstPvp();
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);
    expect(result.outcome).toBe("loss");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(run.reputation - 4);
  });

  it("is neutral on a tied PvP contest (legacy 2-car path maps tie to position 4)", () => {
    const run = advanceToFirstPvp();
    const tieGhost = { id: "tie-ghost", lapTime: BASELINE_CAR.baseLapTime };
    const result = resolveContest(run.build, tieGhost, 10);
    expect(result.outcome).toBe("tie");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(run.reputation);
  });

  it("awards the largest bonus on a PvP win (legacy 2-car path maps win to position 1)", () => {
    const run = advanceToFirstPvp();
    const slowGhost = { id: "slow-ghost", lapTime: 100 };
    const result = resolveContest(run.build, slowGhost, 10);
    expect(result.outcome).toBe("win");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(run.reputation + 3);
  });

  it("uses the real N-car finishing position when the result carries one, ignoring the legacy outcome mapping", () => {
    const run = advanceToFirstPvp();
    const result: ContestResult = { ...resolveContest(run.build, SAMPLE_GHOST, 10), playerPosition: 5 };

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(run.reputation - 1);
  });

  it("decrements reputation for a failed sponsor objective, independent of a simultaneous PvP win", () => {
    const base = advanceToFirstPvp();
    const run: Run = {
      ...base,
      activeSponsorContract: {
        id: "contract",
        sourceEncounterId: "prior",
        objective: { kind: "target-race-time", targetSeconds: 1 },
        payout: 7,
        status: "pending",
      },
    };
    const slowGhost = { id: "slow-ghost", lapTime: 100 };
    const result = resolveContest(run.build, slowGhost, 10);
    expect(result.outcome).toBe("win");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(run.reputation + 3 - 1);
  });

  it("combines the race delta and a failed sponsor objective on the same transition", () => {
    const base = advanceToFirstPvp();
    const run: Run = {
      ...base,
      activeSponsorContract: {
        id: "contract",
        sourceEncounterId: "prior",
        objective: { kind: "target-race-time", targetSeconds: 1 },
        payout: 7,
        status: "pending",
      },
    };
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);
    expect(result.outcome).toBe("loss");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(run.reputation - 4 - 1);
  });

  it("floors reputation at 0 rather than going negative from a combined penalty", () => {
    const base = { ...advanceToFirstPvp(), reputation: 1 };
    const run: Run = {
      ...base,
      activeSponsorContract: {
        id: "contract",
        sourceEncounterId: "prior",
        objective: { kind: "target-race-time", targetSeconds: 1 },
        payout: 7,
        status: "pending",
      },
    };
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.reputation).toBe(0);
  });
});

describe("interestFor (015-economy-depth US2, FR-007/FR-008)", () => {
  it("is 0 for a zero balance and never manufactures credits from nothing", () => {
    expect(interestFor(0)).toBe(0);
  });

  it("is a pure, deterministic function of the banked balance", () => {
    expect(interestFor(50)).toBe(interestFor(50));
  });

  it("derives a nonzero amount from a large enough banked balance", () => {
    expect(interestFor(50)).toBeGreaterThan(0);
  });
});

describe("completePvpEncounter interest wiring (US2)", () => {
  it("appends an interest transaction, as its own transaction kind, when banked credits are large enough", () => {
    const run = { ...advanceToFirstPvp(), credits: 50 };
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);
    expect(result.outcome).toBe("loss");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    const interestTx = completed.creditTransactions.find((tx) => tx.kind === "interest");

    expect(interestTx).toBeDefined();
    expect(interestTx!.amount).toBe(interestFor(50));
    expect(completed.credits).toBe(50 + 2 + interestFor(50));
  });

  it("appends no interest transaction at all when the computed amount would be zero (FR-008)", () => {
    const run = { ...advanceToFirstPvp(), credits: 0 };
    const result = resolveContest(run.build, SAMPLE_GHOST, 10);

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    expect(completed.creditTransactions.some((tx) => tx.kind === "interest")).toBe(false);
  });

  it("computes interest from credits banked before this stage's own participation/win/sponsor income", () => {
    const run = { ...advanceToFirstPvp(), credits: 50 };
    const slowGhost = { id: "slow-ghost", lapTime: 100 };
    const result = resolveContest(run.build, slowGhost, 10);
    expect(result.outcome).toBe("win");

    const completed = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0);
    const interestTx = completed.creditTransactions.find((tx) => tx.kind === "interest");

    expect(interestTx!.amount).toBe(interestFor(50));
  });
});

// 028-pre-race-setup T060: RunSetupMemory (contract §7, FR-012A-C).
describe("028-pre-race-setup: RunSetupMemory (T060)", () => {
  it("a freshly created run has no setup memory — disabled by default (new-run reset)", () => {
    const run = newRun();
    expect(run.setupMemory).toBeUndefined();
  });

  it("commitSetupMemory(enabled=false) never writes a selection, even for eligible families", () => {
    const run = newRun();
    const committed = commitSetupMemory(run, { "driver-aggression": "low" }, false);
    expect(committed.setupMemory).toEqual({ enabled: false, selections: {} });
  });

  it("commitSetupMemory(enabled=true) writes exactly the given family-keyed selections (Start-Race-only write)", () => {
    const run = newRun();
    const committed = commitSetupMemory(run, { "driver-aggression": "low", "gearing": "high" }, true);
    expect(committed.setupMemory).toEqual({
      enabled: true,
      selections: { "driver-aggression": "low", "gearing": "high" },
    });
  });

  it("initialSetupSelections restores remembered positions only for currently eligible controls", () => {
    const memory = { enabled: true, selections: { "driver-aggression": "low" as const, "gearing": "high" as const } };
    const eligible = [{ family: "driver-aggression" as const, label: "Driver Aggression", sourceItemIds: [], magnitude: 1, positions: [] }];

    expect(initialSetupSelections(eligible, memory)).toEqual({ "driver-aggression": "low" });
  });

  it("initialSetupSelections defaults to empty (Balanced) when memory is disabled", () => {
    const memory = { enabled: false, selections: { "driver-aggression": "low" as const } };
    const eligible = [{ family: "driver-aggression" as const, label: "Driver Aggression", sourceItemIds: [], magnitude: 1, positions: [] }];

    expect(initialSetupSelections(eligible, memory)).toEqual({});
  });

  it("initialSetupSelections defaults to empty when no memory exists at all", () => {
    expect(initialSetupSelections([], undefined)).toEqual({});
  });

  it("a dormant remembered value (family currently ineligible) is never surfaced as an initial selection", () => {
    const memory = { enabled: true, selections: { "gearing": "high" as const } };
    const eligibleWithoutGearing = [{ family: "driver-aggression" as const, label: "Driver Aggression", sourceItemIds: [], magnitude: 1, positions: [] }];

    expect(initialSetupSelections(eligibleWithoutGearing, memory)).toEqual({});
  });

  it("a dormant value returns once its family becomes eligible again, without a fresh commit (reactivation)", () => {
    const memory = { enabled: true, selections: { "gearing": "high" as const } };
    const eligibleWithGearing = [
      { family: "driver-aggression" as const, label: "Driver Aggression", sourceItemIds: [], magnitude: 1, positions: [] },
      { family: "gearing" as const, label: "Gearing", sourceItemIds: ["some-item"], magnitude: 1, positions: [] },
    ];

    expect(initialSetupSelections(eligibleWithGearing, memory)).toEqual({ gearing: "high" });
  });

  it("commitSetupMemory merges into (never replaces) prior memory, preserving dormant entries untouched", () => {
    const run = { ...newRun(), setupMemory: { enabled: true, selections: { "gearing": "high" as const } } };
    const committed = commitSetupMemory(run, { "driver-aggression": "low" }, true);

    expect(committed.setupMemory).toEqual({
      enabled: true,
      selections: { "gearing": "high", "driver-aggression": "low" },
    });
  });

  it("disabling the checkbox stops future writes but does not erase what was already remembered", () => {
    const run = { ...newRun(), setupMemory: { enabled: true, selections: { "gearing": "high" as const } } };
    const committed = commitSetupMemory(run, { "driver-aggression": "low" }, false);

    expect(committed.setupMemory).toEqual({ enabled: false, selections: { "gearing": "high" } });
  });
});
