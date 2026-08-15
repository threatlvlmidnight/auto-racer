import { describe, expect, it } from "vitest";
import { BASELINE_CAR } from "../../src/content/sample-data";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import { poolForEntrant } from "../../src/simulation/itemPools";
import {
  acceptReward,
  chooseEncounter,
  declineReward,
  generateEncounterChoices,
  leaveSupplier,
  purchaseStock,
  resolvePendingSponsor,
  restockSupplier,
  seededTargetSeconds,
  sellHeldItem,
  selectSponsorOption,
  toggleLock,
  type PartsSupplierPayload,
  type CrossPollinationPayload,
  type RewardDraftPayload,
  type SponsorMeetingPayload,
} from "../../src/simulation/encounters";
import {
  completePvpEncounter,
  createRun,
  RunTransitionError,
  SPONSOR_OBJECTIVE_TAGS,
  type SponsorContract,
  runIdentityForEntrant,
} from "../../src/simulation/run";
import { resolveContest } from "../../src/simulation/contest";
import type { OfferedItem } from "../../src/simulation/types";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const build = vehicleBuild();

const create = (rng: () => number = () => 0) =>
  createRun({
    runId: "run-choices",
    seed: 7,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build,
    rng,
  });

describe("generateEncounterChoices", () => {
  it("uses injected RNG and returns two stored, distinct choices", () => {
    const run = create(() => 0);
    const firstRead = run.availableChoices;

    expect(firstRead).toHaveLength(2);
    expect(new Set(firstRead.map((choice) => choice.type)).size).toBe(2);
    expect(run.availableChoices).toBe(firstRead);
    expect(firstRead.every((choice) => choice.stageId === run.stages[0].id)).toBe(true);
  });

  it("allows encounter types to repeat across different stage IDs", () => {
    const run = create(() => 0);
    const later = { ...run, stageIndex: 1 };

    expect(generateEncounterChoices(later, () => 0).map((choice) => choice.type)).toEqual(
      run.availableChoices.map((choice) => choice.type),
    );
    expect(generateEncounterChoices(later, () => 0)[0].stageId).not.toBe(
      run.availableChoices[0].stageId,
    );
  });

  it("excludes Sponsor Meeting while a contract is pending", () => {
    const run = create(() => 0.99);
    const pending = {
      ...run,
      activeSponsorContract: {
        id: "contract-1",
        sourceEncounterId: "meeting-1",
        objective: { kind: "win-next-race" as const },
        payout: 7 as const,
        status: "pending" as const,
      },
    };

    expect(generateEncounterChoices(pending, () => 0.99).map((choice) => choice.type)).not.toContain(
      "sponsor-meeting",
    );
  });
});

describe("cross-pollination encounter (020 US3)", () => {
  it("carries one other entrant id and offers only that entrant's exclusive items", () => {
    const base = create(() => 0);
    const choice = {
      id: `${base.stages[0].id}-cross-choice`,
      stageId: base.stages[0].id,
      type: "cross-pollination" as const,
      summary: "",
    };
    const active = chooseEncounter({ ...base, availableChoices: [choice] }, choice.id, () => 0.5);
    const payload = active.activeEncounter!.payload as CrossPollinationPayload;
    expect(payload.kind).toBe("cross-pollination");
    expect(payload.guestEntrantId).not.toBe(base.identity.entrantId);
    const guestIds = new Set(EXCLUSIVE_ITEMS[payload.guestEntrantId].map((item) => item.id));
    const forbiddenIds = new Set([
      ...NEUTRAL_ITEMS,
      ...EXCLUSIVE_ITEMS[base.identity.entrantId],
    ].map((item) => item.id));
    expect(payload.offers).toHaveLength(3);
    expect(payload.offers.every(({ item }) => guestIds.has(item.id))).toBe(true);
    expect(payload.offers.every(({ item }) => !forbiddenIds.has(item.id))).toBe(true);
  });
});

const activate = (
  firstRoll: number,
  payloadRng: () => number = () => 0,
) => {
  const run = create(() => firstRoll);
  const choice = run.availableChoices[0];
  return chooseEncounter(run, choice.id, payloadRng);
};

// rng=0 always lands on index 0 of whatever pool is resolved (Math.floor(0 *
// length) === 0), so most tests need no scripting at all. A few need a
// specific, affordable (price <= 2) real item repeated across every stock
// slot/offer — 020-character-item-pools removed pool injection entirely
// (data-model.md "Signature simplification"), so this computes a constant
// rng that lands on that item's *current* index in the real Mercer pool,
// staying correct even after Mercer's real 15-item pool is authored (US2).
const CHEAP_NEUTRAL_ITEM = NEUTRAL_ITEMS.find((item) => item.price <= 2)!;
function rngSelecting(itemId: string): () => number {
  const pool = poolForEntrant("evelyn-mercer");
  const index = pool.findIndex((candidate) => candidate.id === itemId);
  return () => (index + 0.5) / pool.length;
}

describe("Reward Draft", () => {
  it("stores three weighted offers and accepts at most one with existing placement", () => {
    const active = activate(0.34);
    const payload = active.activeEncounter!.payload as RewardDraftPayload;

    expect(active.activeEncounter!.type).toBe("reward-draft");
    expect(payload.offers).toHaveLength(3);
    expect(new Set(payload.offers.map(({ id }) => id)).size).toBe(3);
    const completed = acceptReward(active, active.activeEncounter!.id, payload.offers[0].id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    expect(completed.build.slots[0].item).toEqual(payload.offers[0].item);
    expect(completed.history).toHaveLength(1);
    expect(() => acceptReward(completed, active.activeEncounter!.id, payload.offers[1].id, {
      area: "vehicle",
      slotId: completed.build.slots[1].slotId,
    })).toThrow();
  });

  it("declines all offers without changing the build", () => {
    const active = activate(0.34);
    const snapshot = structuredClone(active);
    const completed = declineReward(active, active.activeEncounter!.id);

    expect(active).toEqual(snapshot);
    expect(completed.build).toEqual(active.build);
    expect(completed.history[0].acquisitionOutcome?.kind).toBe("declined");
    expect(() => declineReward(completed, active.activeEncounter!.id)).toThrowError(
      RunTransitionError,
    );
  });

  it("draws every offer from the player's own gated pool (020-character-item-pools US1)", () => {
    const active = activate(0.34);
    const payload = active.activeEncounter!.payload as RewardDraftPayload;
    const pool = poolForEntrant(active.identity.entrantId);

    expect(payload.offers.every(({ item }) => pool.some((candidate) => candidate.id === item.id))).toBe(true);
  });
});

describe("Parts Supplier and ledger", () => {
  it("draws stock from the player's own gated pool (020-character-item-pools US1)", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const pool = poolForEntrant(active.identity.entrantId);

    expect(payload.unavailable).toBe(false);
    expect(payload.stock).toHaveLength(3);
    expect(payload.stock.every(({ item }) => pool.some((candidate) => candidate.id === item.id))).toBe(true);
  });

  it("leaves a Parts Supplier encounter without mutating the build", () => {
    const active = activate(0);
    expect(leaveSupplier(active, active.activeEncounter!.id).build).toEqual(active.build);
  });

  it("purchases atomically, records balances, and permits one paid restock", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const affordable = payload.stock.find(({ item }) => item.price <= active.credits)!;
    const purchased = purchaseStock(active, active.activeEncounter!.id, affordable.id, {
      area: "storage",
      index: 0,
    });
    expect(purchased.credits).toBe(5 - affordable.item.price);
    expect(purchased.creditTransactions[0]).toMatchObject({
      kind: "purchase",
      amount: -affordable.item.price,
      balanceAfter: purchased.credits,
    });
    expect((purchased.activeEncounter!.payload as PartsSupplierPayload).receipts?.[0]).toMatchObject({
      offerId: affordable.id,
      itemId: affordable.item.id,
    });
    if (purchased.credits > 0) {
      const restocked = restockSupplier(purchased, purchased.activeEncounter!.id, () => 0);
      expect(restocked.credits).toBe(purchased.credits - 1);
      expect((restocked.activeEncounter!.payload as PartsSupplierPayload).restockUsed).toBe(true);
      expect(() => restockSupplier(restocked, restocked.activeEncounter!.id, () => 0)).toThrow();
    }
  });

  it("allows multiple affordable purchases and atomically replaces the supplier surface", () => {
    // Every stock slot draws the same cheap item (see rngSelecting above), so
    // the second purchase resolves as a tier-upgrade in place
    // (016-duplicate-item-tiering), not a second physical copy in storage.
    const active = activate(0, rngSelecting(CHEAP_NEUTRAL_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const cheap = payload.stock[0].item;
    const first = purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    const second = purchaseStock(first, first.activeEncounter!.id, payload.stock[1].id);
    const restocked = restockSupplier(second, second.activeEncounter!.id, () => 0);
    const restockedPayload = restocked.activeEncounter!.payload as PartsSupplierPayload;

    expect(second.credits).toBe(5 - cheap.price * 2);
    expect(second.build.slots[0].item?.id).toBe(cheap.id);
    expect(second.build.slots[0].tier).toBe(2);
    expect(second.build.storage.every((position) => position.item === null)).toBe(true);
    expect(restocked.credits).toBe(second.credits - 1);
    expect(restockedPayload.stock.map(({ state }) => state)).toEqual(["available", "available", "available"]);
    expect(restockedPayload.purchases).toEqual([]);
  });

  it("rejects unaffordable and invalid placements without mutating run or ledger", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const poor = { ...active, credits: 0 };
    const poorSnapshot = structuredClone(poor);

    expect(() => purchaseStock(poor, poor.activeEncounter!.id, payload.stock[0].id, {
      area: "vehicle",
      slotId: poor.build.slots[0].slotId,
    })).toThrowError(expect.objectContaining({ code: "insufficient-credits" }));
    expect(poor).toEqual(poorSnapshot);

    const invalidSnapshot = structuredClone(active);
    expect(() => purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id, {
      area: "storage",
      index: 99,
    })).toThrowError(expect.objectContaining({ code: "invalid-action" }));
    expect(active).toEqual(invalidSnapshot);
  });

  it("uses stable ordered ledger IDs and guards duplicate stock actions", () => {
    const active = activate(0, rngSelecting(CHEAP_NEUTRAL_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const cheap = payload.stock[0].item;
    const purchased = purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    const restocked = restockSupplier(purchased, purchased.activeEncounter!.id, () => 0);

    expect(restocked.creditTransactions).toEqual([
      expect.objectContaining({
        id: `${active.activeEncounter!.id}-transaction-1`,
        kind: "purchase",
        balanceAfter: 5 - cheap.price,
      }),
      expect.objectContaining({
        id: `${active.activeEncounter!.id}-transaction-2`,
        kind: "restock",
        balanceAfter: 4 - cheap.price,
      }),
    ]);
    expect(() => purchaseStock(purchased, purchased.activeEncounter!.id, payload.stock[0].id, {
      area: "vehicle",
      slotId: purchased.build.slots[1].slotId,
    })).toThrowError(expect.objectContaining({ code: "invalid-action" }));
  });
});

describe("duplicate acquisition routing (016-duplicate-item-tiering US1/US3)", () => {
  const heldBuild = (item: OfferedItem, tier: 1 | 2 | 3 = 1) => ({
    ...vehicleBuild(),
    slots: vehicleBuild().slots.map((slot, index) => index === 0 ? { ...slot, item, tier } : slot),
  });
  const cheap = CHEAP_NEUTRAL_ITEM;

  it("purchaseStock resolves a tier-upgrade in place, without requiring or consulting a placement", () => {
    const run = create(() => 0);
    const held = { ...run, build: heldBuild(cheap, 1) };
    const active = chooseEncounter(
      held,
      held.availableChoices.find((c) => c.type === "parts-supplier")!.id,
      rngSelecting(cheap.id),
    );
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;

    const purchased = purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id);

    expect(purchased.build.slots[0].item?.id).toBe(cheap.id);
    expect(purchased.build.slots[0].tier).toBe(2);
    expect(purchased.build.storage.every((position) => position.item === null)).toBe(true);
    expect(purchased.credits).toBe(active.credits - cheap.price);
    expect((purchased.activeEncounter!.payload as PartsSupplierPayload)
      .stock.find(({ id }) => id === payload.stock[0].id)!.state).toBe("purchased");
  });

  it("purchaseStock resolves a max-tier-convert as a duplicate-conversion transaction, leaving the build untouched", () => {
    const run = create(() => 0);
    const held = { ...run, build: heldBuild(cheap, 3) };
    const active = chooseEncounter(
      held,
      held.availableChoices.find((c) => c.type === "parts-supplier")!.id,
      rngSelecting(cheap.id),
    );
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const buildSnapshot = structuredClone(active.build);

    const converted = purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id);

    expect(converted.build).toEqual(buildSnapshot);
    expect(converted.credits).toBe(active.credits - cheap.price + Math.floor(cheap.price / 2));
    expect(converted.creditTransactions).toEqual([
      ...active.creditTransactions,
      expect.objectContaining({ kind: "purchase", amount: -cheap.price }),
      expect.objectContaining({ kind: "duplicate-conversion", amount: Math.floor(cheap.price / 2) }),
    ]);
    expect((converted.activeEncounter!.payload as PartsSupplierPayload)
      .stock.find(({ id }) => id === payload.stock[0].id)!.state).toBe("purchased");
  });

  it("acceptReward resolves a tier-upgrade in place, without requiring or consulting a placement", () => {
    const run = create(() => 0);
    const held = { ...run, build: heldBuild(cheap, 2) };
    const active = chooseEncounter(
      held,
      held.availableChoices.find((c) => c.type === "reward-draft")!.id,
      rngSelecting(cheap.id),
    );
    const payload = active.activeEncounter!.payload as RewardDraftPayload;

    const completed = acceptReward(active, active.activeEncounter!.id, payload.offers[0].id);

    expect(completed.build.slots[0].item?.id).toBe(cheap.id);
    expect(completed.build.slots[0].tier).toBe(3);
    expect(completed.build.storage.every((position) => position.item === null)).toBe(true);
  });

  it("acceptReward resolves a max-tier-convert as a duplicate-conversion transaction, leaving the build untouched", () => {
    const run = create(() => 0);
    const held = { ...run, build: heldBuild(cheap, 3) };
    const active = chooseEncounter(
      held,
      held.availableChoices.find((c) => c.type === "reward-draft")!.id,
      rngSelecting(cheap.id),
    );
    const payload = active.activeEncounter!.payload as RewardDraftPayload;
    const buildSnapshot = structuredClone(active.build);

    const completed = acceptReward(active, active.activeEncounter!.id, payload.offers[0].id);

    expect(completed.build).toEqual(buildSnapshot);
    expect(completed.creditTransactions).toEqual([
      ...active.creditTransactions,
      expect.objectContaining({ kind: "duplicate-conversion", amount: Math.floor(cheap.price / 2) }),
    ]);
    expect(completed.history).toHaveLength(active.history.length + 1);
  });
});

describe("Sponsor Meeting", () => {
  it("stores immediate and two distinct conditional options with exact targets", () => {
    const active = activate(0.99);
    const payload = active.activeEncounter!.payload as SponsorMeetingPayload;
    expect(payload.options).toHaveLength(3);
    expect(payload.options[0]).toMatchObject({ kind: "immediate", payout: 2 });
    expect(new Set(payload.options.slice(1).map(({ kind }) => kind)).size).toBe(2);
    expect(seededTargetSeconds({ seed: 7, pvpOrdinal: 1, baseLapTime: 6, lapCount: 10 }))
      .toBeGreaterThanOrEqual(54);
    expect(seededTargetSeconds({ seed: 7, pvpOrdinal: 1, baseLapTime: 6, lapCount: 10 }))
      .toBeLessThanOrEqual(57);
  });

  it("records immediate payout or one pending run-identity contract", () => {
    const immediateRun = activate(0.99);
    const immediatePayload = immediateRun.activeEncounter!.payload as SponsorMeetingPayload;
    const immediate = selectSponsorOption(
      immediateRun,
      immediateRun.activeEncounter!.id,
      immediatePayload.options[0].id,
    );
    expect(immediate.credits).toBe(7);
    expect(immediate.activeSponsorContract).toBeNull();
    expect(immediate.creditTransactions[0]).toMatchObject({ kind: "sponsor-immediate", amount: 2 });

    const conditionalRun = activate(0.99);
    const conditionalPayload = conditionalRun.activeEncounter!.payload as SponsorMeetingPayload;
    const conditional = selectSponsorOption(
      conditionalRun,
      conditionalRun.activeEncounter!.id,
      conditionalPayload.options[1].id,
    );
    expect(conditional.activeSponsorContract?.payout).toBe(7);
    if (conditional.activeSponsorContract?.objective.kind === "trigger-tagged-items") {
      expect(SPONSOR_OBJECTIVE_TAGS).toContain(conditional.activeSponsorContract.objective.tag);
      expect(conditional.activeSponsorContract.objective.requiredEvents).toBe(10);
    }
  });

  it("selects a trigger-tagged-items tag deterministically from SPONSOR_OBJECTIVE_TAGS via the payload rng (020-character-item-pools research.md Decision 4)", () => {
    // Roll 1 (0.99) picks "trigger-tagged-items" as the first of the two
    // conditional kinds; roll 2 (0) picks the second (irrelevant here); roll
    // 3 is objectiveForKind's own tag-index pick, consumed while resolving
    // "trigger-tagged-items" since it's processed first in the map.
    const scriptedRng = (rolls: number[]) => {
      let index = 0;
      return () => rolls[index++];
    };
    const tagFor = (rolls: number[]) => {
      const run = activate(0.99, scriptedRng(rolls));
      const payload = run.activeEncounter!.payload as SponsorMeetingPayload;
      const option = payload.options.find((candidate) => candidate.kind === "trigger-tagged-items");
      if (!option || option.kind === "immediate") return undefined;
      return option.objective.kind === "trigger-tagged-items" ? option.objective.tag : undefined;
    };

    expect(tagFor([0.99, 0, 0])).toBe(SPONSOR_OBJECTIVE_TAGS[0]);
    expect(tagFor([0.99, 0, 0])).toBe(tagFor([0.99, 0, 0]));
    expect(tagFor([0.99, 0, 0.99])).toBe(SPONSOR_OBJECTIVE_TAGS[SPONSOR_OBJECTIVE_TAGS.length - 1]);
    expect(tagFor([0.99, 0, 0])).not.toBe(tagFor([0.99, 0, 0.99]));
  });

  it("generates every conditional objective deterministically with stable option IDs", () => {
    const first = activate(0.99, () => 0);
    const middle = activate(0.99, () => 0.5);
    const last = activate(0.99, () => 0.99);
    const payloads = [first, middle, last].map(
      (run) => run.activeEncounter!.payload as SponsorMeetingPayload,
    );

    expect(payloads.flatMap(({ options }) => options.slice(1).map(({ kind }) => kind))).toEqual(
      expect.arrayContaining(["win-next-race", "target-race-time", "trigger-tagged-items"]),
    );
    payloads.forEach((payload, payloadIndex) => {
      const encounterId = [first, middle, last][payloadIndex].activeEncounter!.id;
      expect(payload.options.map(({ id }) => id)).toEqual([
        `${encounterId}-sponsor-immediate`,
        `${encounterId}-sponsor-contract-1`,
        `${encounterId}-sponsor-contract-2`,
      ]);
      const tagged = payload.options.find(({ kind }) => kind === "trigger-tagged-items");
      if (tagged && tagged.kind !== "immediate" && tagged.objective.kind === "trigger-tagged-items") {
        expect(SPONSOR_OBJECTIVE_TAGS).toContain(tagged.objective.tag);
        expect(tagged.objective.requiredEvents).toBe(10);
      }
    });
  });

  it("produces stable whole-second targets 3-6 seconds below every scheduled baseline (017-season-structure-grow US2)", () => {
    const lapCountByOrdinal = { 1: 10, 2: 12, 3: 14, 4: 16 } as const;
    ([1, 2, 3, 4] as const).forEach((pvpOrdinal) => {
      const lapCount = lapCountByOrdinal[pvpOrdinal];
      const target = seededTargetSeconds({
        seed: 7,
        pvpOrdinal,
        baseLapTime: BASELINE_CAR.baseLapTime,
        lapCount,
      });
      const baseline = Math.round(BASELINE_CAR.baseLapTime * lapCount);

      expect(Number.isInteger(target)).toBe(true);
      expect(baseline - target).toBeGreaterThanOrEqual(3);
      expect(baseline - target).toBeLessThanOrEqual(6);
      expect(seededTargetSeconds({
        seed: 7,
        pvpOrdinal,
        baseLapTime: BASELINE_CAR.baseLapTime,
        lapCount,
      })).toBe(target);
    });
  });
});

describe("sponsor next-PvP-stage lookup across the 12-stage schedule (017-season-structure-grow US2, FR-005)", () => {
  // objectiveForKind's next-pvp lookup (run.stages.slice(stageIndex+1).find(...))
  // and the rival/track ordinal-consuming formulas it feeds are unbounded scans —
  // no code change was needed to widen them (research.md Decision 5). These tests
  // verify that claim holds at all four widened PvP ordinals, including
  // acceptance at the 11th (last) choice stage, immediately before the 12th
  // (final) PvP stage.
  const choiceStageIndexBeforeEachPvp = [1, 4, 7, 10]; // 0-indexed: stages 2, 5, 8, 11
  const pvpOrdinalAfter = [1, 2, 3, 4] as const;
  const lapCountAfter = [10, 12, 14, 16] as const;

  it.each(choiceStageIndexBeforeEachPvp.map((stageIndex, i) => [stageIndex, pvpOrdinalAfter[i], lapCountAfter[i]] as const))(
    "targets pvpOrdinal %i / lapCount %i's PvP stage when a target-race-time contract is accepted immediately before it",
    (stageIndex, pvpOrdinal, lapCount) => {
      const run = { ...create(), stageIndex, availableChoices: [
        { id: "sponsor-choice", stageId: `run-choices-stage-${stageIndex + 1}`, type: "sponsor-meeting" as const, summary: "" },
      ] };
      const active = chooseEncounter(run, "sponsor-choice", () => 0.99);
      const payload = active.activeEncounter!.payload as SponsorMeetingPayload;
      const targetTimeOption = payload.options.find((option) => option.kind === "target-race-time");

      expect(targetTimeOption).toBeDefined();
      if (targetTimeOption?.kind !== "target-race-time" || targetTimeOption.objective.kind !== "target-race-time") return;
      expect(targetTimeOption.objective.targetSeconds).toBe(seededTargetSeconds({
        seed: run.seed,
        pvpOrdinal,
        baseLapTime: run.build.car.baseLapTime,
        lapCount,
      }));
    },
  );

  it("continues to count trigger-tagged-items events correctly when accepted at the last choice stage before the 4th (final) PvP", () => {
    const run = { ...create(), stageIndex: 10, availableChoices: [
      { id: "sponsor-choice", stageId: "run-choices-stage-11", type: "sponsor-meeting" as const, summary: "" },
    ] };
    const active = chooseEncounter(run, "sponsor-choice", () => 0.99);
    const payload = active.activeEncounter!.payload as SponsorMeetingPayload;
    const taggedOption = payload.options.find((option) => option.kind === "trigger-tagged-items");

    expect(taggedOption).toBeDefined();
    if (!taggedOption || taggedOption.kind === "immediate" || taggedOption.objective.kind !== "trigger-tagged-items") return;
    expect(SPONSOR_OBJECTIVE_TAGS).toContain(taggedOption.objective.tag);
    expect(taggedOption.objective.requiredEvents).toBe(10);
  });
});

describe("sponsor resolution", () => {
  const resultFor = (outcome: "win" | "loss" | "tie", playerTime = 55) => ({
    lapCount: 10,
    playerTime,
    ghostTime: outcome === "win" ? playerTime + 1 : outcome === "loss" ? playerTime - 1 : playerTime,
    gap: outcome === "win" ? -1 : outcome === "loss" ? 1 : 0,
    outcome,
    board: [LEGACY_ITEM_POOL.find((item) => item.identityTag === "performance")!],
    storage: [],
    laps: Array.from({ length: 10 }, (_, index) => ({
      lap: index + 1,
      playerLapTime: playerTime / 10,
      ghostLapTime: playerTime / 10,
      firedItems: [{ id: LEGACY_ITEM_POOL.find((item) => item.identityTag === "performance")!.id, contribution: -1 }],
    })),
  });
  const contract = (objective: SponsorContract["objective"]): SponsorContract => ({
    id: "contract",
    sourceEncounterId: "meeting",
    objective,
    payout: 7,
    status: "pending",
  });

  it("evaluates win, target-time, and tagged-trigger objectives with exact actuals", () => {
    expect(resolvePendingSponsor(contract({ kind: "win-next-race" }), resultFor("win")))
      .toMatchObject({ succeeded: true, contract: { actual: "win", status: "succeeded" } });
    expect(resolvePendingSponsor(
      contract({ kind: "target-race-time", targetSeconds: 55 }),
      resultFor("loss", 55),
    )).toMatchObject({ succeeded: true, contract: { actual: 55, status: "succeeded" } });
    expect(resolvePendingSponsor(
      contract({ kind: "trigger-tagged-items", tag: "momentum", requiredEvents: 10 }),
      resultFor("loss"),
    )).toMatchObject({
      succeeded: true,
      actual: 10,
      required: 10,
      contract: { actual: 10, status: "succeeded" },
    });
    expect(resolvePendingSponsor(contract({ kind: "win-next-race" }), resultFor("loss")))
      .toMatchObject({ succeeded: false, contract: { status: "failed" } });
  });

  it("settles payout, history outcome, clearing, and re-eligibility atomically at the next PvP", () => {
    let run = create(() => 0);
    for (let stage = 0; stage < 2; stage += 1) {
      run = chooseEncounter(run, run.availableChoices[0].id, () => 0);
      run = declineOrLeave(run);
    }
    const pending = contract({ kind: "win-next-race" });
    run = { ...run, activeSponsorContract: pending };
    const result = resolveContest(run.build, { id: "slow", lapTime: 7 }, 10);
    const settled = completePvpEncounter(run, run.activeEncounter!.id, result, () => 0.99);

    expect(settled.activeSponsorContract).toBeNull();
    expect(settled.credits).toBe(16);
    expect(settled.creditTransactions.slice(-3).map(({ kind, amount }) => ({ kind, amount })))
      .toEqual([
        { kind: "participation", amount: 2 },
        { kind: "win-bonus", amount: 2 },
        { kind: "sponsor-conditional", amount: 7 },
      ]);
    expect(settled.history[settled.history.length - 1]?.sponsorOutcome).toMatchObject({
      id: pending.id,
      status: "succeeded",
      resolvedEncounterId: run.activeEncounter!.id,
    });
    expect(generateEncounterChoices(settled, () => 0.99).map(({ type }) => type))
      .toContain("sponsor-meeting");
  });
});

function declineOrLeave(run: ReturnType<typeof create>): ReturnType<typeof create> {
  if (run.activeEncounter?.type === "parts-supplier") {
    return leaveSupplier(run, run.activeEncounter.id);
  }
  return declineReward(run, run.activeEncounter!.id);
}
describe("atomic acquisition through garage commands", () => {
  const supplierRun = () => {
    const run = create(() => 0);
    const active = chooseEncounter(run, run.availableChoices.find((c) => c.type === "parts-supplier")!.id, () => 0);
    return { active, payload: active.activeEncounter!.payload as PartsSupplierPayload };
  };

  it("commits credits, stock state, and vehicle placement together", () => {
    const { active, payload } = supplierRun();
    const affordable = payload.stock.find((entry) => entry.item.price <= active.credits)!;
    const slotId = active.build.slots[2].slotId;

    const purchased = purchaseStock(active, active.activeEncounter!.id, affordable.id, {
      area: "vehicle",
      slotId,
    });

    expect(purchased.build.slots[2].item?.id).toBe(affordable.item.id);
    expect(purchased.credits).toBe(active.credits - affordable.item.price);
    expect((purchased.activeEncounter!.payload as PartsSupplierPayload)
      .stock.find((entry) => entry.id === affordable.id)!.state).toBe("purchased");
    expect(purchased.creditTransactions).toHaveLength(active.creditTransactions.length + 1);
  });

  it("spends nothing and marks nothing purchased when the placement itself fails", () => {
    const { active, payload } = supplierRun();
    const affordable = payload.stock.find((entry) => entry.item.price <= active.credits)!;
    const snapshot = structuredClone(active);

    expect(() => purchaseStock(active, active.activeEncounter!.id, affordable.id, {
      area: "vehicle",
      slotId: "no-such-slot",
    })).toThrowError(expect.objectContaining({ code: "invalid-action" }));

    expect(active).toStrictEqual(snapshot);
    expect(active.credits).toBe(snapshot.credits);
  });

  it("rejects an unconfirmed replacement without spending credits", () => {
    const { active, payload } = supplierRun();
    const affordable = payload.stock.find((entry) => entry.item.price <= active.credits)!;
    const occupied = {
      ...active,
      build: {
        ...active.build,
        slots: active.build.slots.map((slot, index) =>
          (index === 0 ? { ...slot, item: LEGACY_ITEM_POOL[5] } : slot)),
      },
    };
    const snapshot = structuredClone(occupied);

    expect(() => purchaseStock(occupied, occupied.activeEncounter!.id, affordable.id, {
      area: "vehicle",
      slotId: occupied.build.slots[0].slotId,
    })).toThrowError(expect.objectContaining({ code: "invalid-action" }));

    expect(occupied).toStrictEqual(snapshot);
  });

  it("places a purchase into a storage position atomically", () => {
    const { active, payload } = supplierRun();
    const affordable = payload.stock.find((entry) => entry.item.price <= active.credits)!;

    const purchased = purchaseStock(active, active.activeEncounter!.id, affordable.id, {
      area: "storage",
      index: 1,
    });

    expect(purchased.build.storage[1].item?.id).toBe(affordable.item.id);
    expect(purchased.build.slots.every((slot) => slot.item === null)).toBe(true);
    expect(purchased.credits).toBe(active.credits - affordable.item.price);
  });

  it("commits reward acceptance and encounter completion together", () => {
    const run = create(() => 0);
    const active = chooseEncounter(run, run.availableChoices.find((c) => c.type === "reward-draft")!.id, () => 0);
    const payload = active.activeEncounter!.payload as RewardDraftPayload;
    const slotId = active.build.slots[1].slotId;

    const completed = acceptReward(active, active.activeEncounter!.id, payload.offers[0].id, {
      area: "vehicle",
      slotId,
    });

    expect(completed.build.slots[1].item?.id).toBe(payload.offers[0].item.id);
    expect(completed.history).toHaveLength(active.history.length + 1);
    expect(completed.stageIndex).toBe(active.stageIndex + 1);
  });

  it("does not complete the reward encounter when its placement fails", () => {
    const run = create(() => 0);
    const active = chooseEncounter(run, run.availableChoices.find((c) => c.type === "reward-draft")!.id, () => 0);
    const payload = active.activeEncounter!.payload as RewardDraftPayload;
    const snapshot = structuredClone(active);

    expect(() => acceptReward(active, active.activeEncounter!.id, payload.offers[0].id, {
      area: "storage",
      index: 99,
    })).toThrowError(expect.objectContaining({ code: "invalid-action" }));

    expect(active).toStrictEqual(snapshot);
    expect(active.history).toHaveLength(snapshot.history.length);
  });
});

describe("sellHeldItem (015-economy-depth US3)", () => {
  it("appends exactly one sell-back transaction and replaces run.build with the sale's result", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const affordable = payload.stock.find(({ item }) => item.price <= active.credits)!;
    const purchased = purchaseStock(active, active.activeEncounter!.id, affordable.id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });

    const sold = sellHeldItem(purchased, purchased.activeEncounter!.id, {
      area: "vehicle",
      slotId: purchased.build.slots[0].slotId,
    });

    expect(sold.build.slots[0].item).toBeNull();
    const sellTx = sold.creditTransactions.find((tx) => tx.kind === "sell-back");
    expect(sellTx).toBeDefined();
    expect(sellTx!.amount).toBe(Math.floor(affordable.item.price / 2));
    expect(sold.credits).toBe(purchased.credits + Math.floor(affordable.item.price / 2));
  });

  it("throws a typed invalid-action error rather than silently no-op when there is nothing to sell", () => {
    const active = activate(0);
    expect(() =>
      sellHeldItem(active, active.activeEncounter!.id, { area: "vehicle", slotId: active.build.slots[0].slotId }),
    ).toThrowError(expect.objectContaining({ code: "invalid-action" }));
  });

  it("throws the same encounter-id-mismatch code as other Parts Supplier actions when misapplied", () => {
    const active = activate(0);
    expect(() =>
      sellHeldItem(active, "wrong-id", { area: "vehicle", slotId: active.build.slots[0].slotId }),
    ).toThrowError(expect.objectContaining({ code: "encounter-id-mismatch" }));
  });

  it("sells a stored item too, granting credits without touching any other position", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const affordable = payload.stock.find(({ item }) => item.price <= active.credits)!;
    const purchased = purchaseStock(active, active.activeEncounter!.id, affordable.id, {
      area: "storage",
      index: 0,
    });

    const sold = sellHeldItem(purchased, purchased.activeEncounter!.id, { area: "storage", index: 0 });

    expect(sold.build.storage[0].item).toBeNull();
    expect(sold.credits).toBe(purchased.credits + Math.floor(affordable.item.price / 2));
  });
});

describe("card locking (015-economy-depth US4)", () => {
  it("defaults every newly-generated stock entry to unlocked", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    expect(payload.stock.every((entry) => entry.locked === false)).toBe(true);
  });

  it("flips exactly one entry's locked flag, appending no credit transaction", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const target = payload.stock[0];

    const locked = toggleLock(active, active.activeEncounter!.id, target.id);
    const lockedPayload = locked.activeEncounter!.payload as PartsSupplierPayload;

    expect(lockedPayload.stock.find(({ id }) => id === target.id)?.locked).toBe(true);
    expect(lockedPayload.stock.filter((entry) => entry.locked)).toHaveLength(1);
    expect(locked.creditTransactions).toEqual(active.creditTransactions);
    expect(locked.credits).toBe(active.credits);

    const unlocked = toggleLock(locked, locked.activeEncounter!.id, target.id);
    expect((unlocked.activeEncounter!.payload as PartsSupplierPayload).stock.find(({ id }) => id === target.id)?.locked)
      .toBe(false);
  });

  it("throws the same encounter-id-mismatch/invalid-encounter-type codes other Parts Supplier actions throw", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;

    expect(() => toggleLock(active, "wrong-id", payload.stock[0].id)).toThrowError(
      expect.objectContaining({ code: "encounter-id-mismatch" }),
    );

    const rewardActive = activate(0.34);
    expect(rewardActive.activeEncounter!.type).toBe("reward-draft");
    expect(() => toggleLock(rewardActive, rewardActive.activeEncounter!.id, "any-stock-id")).toThrowError(
      expect.objectContaining({ code: "invalid-encounter-type" }),
    );
  });

  it("clears lock state when the supplier surface is atomically replaced", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const target = payload.stock[0];
    const locked = toggleLock(active, active.activeEncounter!.id, target.id);

    const rerolled = restockSupplier(locked, locked.activeEncounter!.id, () => 0.99);
    const rerolledPayload = rerolled.activeEncounter!.payload as PartsSupplierPayload;

    expect(rerolledPayload.stock.every((entry) => !entry.locked && entry.state === "available")).toBe(true);
    expect(rerolledPayload.stock[0].id).not.toBe(target.id);
  });

  it("never carries a lock into a freshly-generated encounter", () => {
    const active = activate(0);
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    toggleLock(active, active.activeEncounter!.id, payload.stock[0].id);

    // A brand new Parts Supplier payload (e.g. the next one generated) always
    // starts fully unlocked — locks are scoped to one encounter instance.
    const fresh = activate(0);
    const freshPayload = fresh.activeEncounter!.payload as PartsSupplierPayload;
    expect(freshPayload.stock.every((entry) => entry.locked === false)).toBe(true);
  });
});
