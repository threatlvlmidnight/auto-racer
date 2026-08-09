import { describe, expect, it } from "vitest";
import { BASELINE_CAR, ITEM_POOL, SAMPLE_GHOST } from "../../src/content/sample-data";
import { chooseEncounter } from "../../src/simulation/encounters";
import { resolveContest } from "../../src/simulation/contest";
import {
  completePvpEncounter,
  completeNonPvpEncounter,
  createUnavailableRun,
  createRun,
  runProgress,
  RunTransitionError,
  summarizeRunHistory,
  type Run,
} from "../../src/simulation/run";
import type { EntrantId, RunIdentity, VehicleBuild } from "../../src/simulation/types";
import { createEmptyVehicleBuild } from "../../src/simulation/build";
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
    current = chooseEncounter(current, current.availableChoices[0].id, () => 0, ITEM_POOL);
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
    ]);
    expect(run.availableChoices).toHaveLength(2);
    expect(new Set(run.availableChoices.map((choice) => choice.type)).size).toBe(2);
  });
});

describe("non-PvP run transitions", () => {
  it("activates one stored choice without selecting an item", () => {
    const run = newRun();
    const choice = run.availableChoices[0];
    const active = chooseEncounter(run, choice.id, sequenceRng(0.1, 0.8), ITEM_POOL);

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
    const active = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
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

    expect(() => chooseEncounter(run, "wrong-choice", () => 0, ITEM_POOL)).toThrowError(
      expect.objectContaining({ code: "encounter-id-mismatch" }),
    );
    expect(() =>
      completeNonPvpEncounter(run, "stale-encounter", { build: run.build }, () => 0),
    ).toThrowError(expect.objectContaining({ code: "encounter-id-mismatch" }));
  });

  it("rejects generic completion at a scheduled PvP stage", () => {
    let run = newRun();
    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
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
    ["lap count", (result: ReturnType<typeof resolveContest>) => ({ ...result, lapCount: 12 })],
    ["board IDs", (result: ReturnType<typeof resolveContest>) => ({ ...result, board: [ITEM_POOL[0]] })],
    ["storage IDs", (result: ReturnType<typeof resolveContest>) => ({ ...result, storage: [ITEM_POOL[0]] })],
  ])("rejects mismatched %s before any mutation", (_label, mutate) => {
    const active = advanceToFirstPvp();
    const snapshot = structuredClone(active);
    const mismatched = mutate(resolveContest(active.build, SAMPLE_GHOST, 10));

    expect(() => completePvpEncounter(active, active.activeEncounter!.id, mismatched, () => 0))
      .toThrowError(expect.objectContaining({ code: "race-result-mismatch" }));
    expect(active).toEqual(snapshot);
  });

  it("rejects stale and duplicate IDs and completes the final PvP exactly once", () => {
    let run = advanceToFirstPvp();
    const firstId = run.activeEncounter!.id;
    const firstResult = resolveContest(run.build, SAMPLE_GHOST, 10);
    expect(() => completePvpEncounter(run, "wrong-id", firstResult, () => 0)).toThrowError(
      expect.objectContaining({ code: "encounter-id-mismatch" }),
    );
    run = completePvpEncounter(run, firstId, firstResult, () => 0);
    expect(() => completePvpEncounter(run, firstId, firstResult, () => 0)).toThrowError(
      RunTransitionError,
    );

    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0, ITEM_POOL);
      run = completeNonPvpEncounter(run, run.activeEncounter!.id, { build: run.build }, () => 0);
    }
    const finalId = run.activeEncounter!.id;
    run = completePvpEncounter(run, finalId, resolveContest(run.build, SAMPLE_GHOST, 12), () => 0);

    expect(run.status).toBe("completed");
    expect(run.stageIndex).toBe(6);
    expect(run.history).toHaveLength(6);
    expect(() => completePvpEncounter(run, finalId, resolveContest(run.build, SAMPLE_GHOST, 12)))
      .toThrowError(expect.objectContaining({ code: "run-not-active" }));
  });
});

describe("run status and summaries", () => {
  it("summarizes chronological acquisition, credits, PvP, and sponsor details", () => {
    const base = newRun();
    const detailed: Run = {
      ...base,
      status: "completed",
      stageIndex: 6,
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
            objective: { kind: "trigger-tagged-items", identityTag: "performance", requiredEvents: 10 },
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
    expect(runProgress(detailed)).toEqual({ current: 6, total: 6, remaining: 0, status: "completed" });
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
    expect(() => chooseEncounter(completed, completed.availableChoices[0].id, () => 0, ITEM_POOL))
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

  it("starts every confirmed run with 5 credits, stage 1, the fixed six stages, and no history", () => {
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
    expect(result.run.stages).toHaveLength(6);
    expect(result.run.stages.map((stage) => stage.kind))
      .toEqual(["choice", "choice", "pvp", "choice", "choice", "pvp"]);
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
