import { describe, expect, it } from "vitest";
import { NEUTRAL_ITEMS } from "../../src/content/items";
import { poolForEntrant } from "../../src/simulation/itemPools";
import {
  chooseEncounter,
  declineReward,
  purchaseStock,
  restockSupplier,
  type PartsSupplierPayload,
} from "../../src/simulation/encounters";
import { createRun, RunTransitionError, runIdentityForEntrant } from "../../src/simulation/run";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { cardFeedbackState } from "../../src/scenes/cardFeedbackPresentation";
import { resolveDuplicateAcquisition } from "../../src/simulation/tiering";

/**
 * Feature 032 T004: pinned baselines for the Supplier feedback gaps reported
 * from the hosted demo. Cases marked BASELINE-GAP document current behavior
 * that US3 (T050-T054) is tasked to change; they are replaced in place when
 * the fix lands. Cases without that marker are permanent contract pins.
 */

const create = () =>
  createRun({
    runId: "supplier-feedback-run",
    seed: 7,
    identityTag: "performance",
    identity: runIdentityForEntrant("evelyn-mercer")!,
    build: vehicleBuild(),
    rng: () => 0,
  });

function activateSupplier(rng: () => number = () => 0) {
  const run = create();
  const choice = {
    id: `${run.stages[0].id}-supplier-choice`,
    stageId: run.stages[0].id,
    type: "parts-supplier" as const,
    summary: "",
  };
  const active = chooseEncounter({ ...run, availableChoices: [choice] }, choice.id, rng);
  expect(active.activeEncounter?.type).toBe("parts-supplier");
  return active;
}

/** Constant rng landing on a specific affordable item in Mercer's pool. */
function rngSelecting(itemId: string): () => number {
  const pool = poolForEntrant("evelyn-mercer");
  const index = pool.findIndex((candidate) => candidate.id === itemId);
  expect(index).toBeGreaterThanOrEqual(0);
  return () => (index + 0.5) / pool.length;
}

const CHEAP_ITEM = NEUTRAL_ITEMS.find((item) => item.price <= 2)!;

describe("Supplier purchased-slot semantics", () => {
  it("a purchased stock entry stays in its slot marked purchased (permanent pin)", () => {
    const active = activateSupplier(rngSelecting(CHEAP_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const target = payload.stock[0];

    const purchased = purchaseStock(active, active.activeEncounter!.id, target.id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    const after = purchased.activeEncounter!.payload as PartsSupplierPayload;

    expect(after.stock[0].id).toBe(target.id);
    expect(after.stock[0].state).toBe("purchased");
    expect(after.purchases).toEqual([target.item.id]);
  });

  it("a consumed slot rejects a second purchase (permanent pin)", () => {
    const active = activateSupplier(rngSelecting(CHEAP_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const target = payload.stock[0];

    const purchased = purchaseStock(active, active.activeEncounter!.id, target.id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });

    expect(() =>
      purchaseStock(purchased, purchased.activeEncounter!.id, target.id, {
        area: "storage",
        index: 0,
      }),
    ).toThrowError(RunTransitionError);
    expect(purchased.credits).toBe(active.credits - target.item.price);
  });
});

describe("Supplier restock semantics", () => {
  it("atomically replaces all three slots with fresh available offers", () => {
    const active = activateSupplier(rngSelecting(CHEAP_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const target = payload.stock[0];

    const purchased = purchaseStock(active, active.activeEncounter!.id, target.id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    const restocked = restockSupplier(purchased, purchased.activeEncounter!.id, () => 0.99);
    const after = restocked.activeEncounter!.payload as PartsSupplierPayload;

    expect(after.stock).toHaveLength(3);
    expect(after.stock.every((entry) => entry.state === "available" && !entry.locked)).toBe(true);
    expect(after.purchases).toEqual([]);
    expect(after.restockUsed).toBe(true);
  });
});

describe("Reward Draft skip", () => {
  it("records no acquisition or credit mutation", () => {
    const active = createRun({ runId: "skip-test", seed: 4, identityTag: "performance", identity: runIdentityForEntrant("evelyn-mercer")!, build: vehicleBuild(), rng: () => 0.34 });
    const choice = active.availableChoices[0];
    const draft = chooseEncounter(active, choice.id, () => 0);
    if (draft.activeEncounter?.type !== "reward-draft") throw new Error("expected reward draft");
    const skipped = declineReward(draft, draft.activeEncounter.id);
    expect(skipped.build).toEqual(draft.build);
    expect(skipped.credits).toBe(draft.credits);
    expect(skipped.creditTransactions).toEqual(draft.creditTransactions);
  });
});

describe("Duplicate-tier feedback gap", () => {
  it("returns one acquisition receipt per purchase with tier transition evidence", () => {
    // Constant rng fills all three stock slots with the same cheap item, so
    // the second purchase is a genuine duplicate tier-up.
    const active = activateSupplier(rngSelecting(CHEAP_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    expect(payload.stock.every((entry) => entry.item.id === CHEAP_ITEM.id)).toBe(true);

    const first = purchaseStock(active, active.activeEncounter!.id, payload.stock[0].id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    const second = purchaseStock(first, first.activeEncounter!.id, payload.stock[1].id, {
      area: "vehicle",
      slotId: first.build.slots[1].slotId,
    });

    // The authoritative tier mutation happened exactly once...
    const tieredSlot = second.build.slots.find((slot) => slot.item?.id === CHEAP_ITEM.id)!;
    expect(tieredSlot.tier).toBe(2);
    const after = second.activeEncounter!.payload as PartsSupplierPayload;
    expect(after.purchases).toEqual([CHEAP_ITEM.id, CHEAP_ITEM.id]);
    expect(after.receipts!.map((receipt) => [receipt.oldTier, receipt.newTier])).toEqual([[null, 1], [1, 2]]);
    expect(after.receipts![1].changedEffects[0]).toEqual({
      label: "Authored effect", oldValue: "1× tier strength", newValue: "2× tier strength",
    });
  });
});

describe("Feature 035 upgrade feedback (T027/T030)", () => {
  it("exposes an explicit upgrade-eligible cue before purchase from authoritative state", () => {
    // A held duplicate installed at tier 1.
    const build = vehicleBuild([CHEAP_ITEM]);
    const resolution = resolveDuplicateAcquisition(build, CHEAP_ITEM);
    expect(resolution).toMatchObject({ kind: "tier-upgrade", toTier: 2 });

    const card = cardFeedbackState({
      item: CHEAP_ITEM,
      role: "offer",
      availability: "available",
      upgradeEligible: true,
      upgradeReason: `Held duplicate upgrades to Tier ${resolution.kind === "tier-upgrade" ? resolution.toTier : "2"}`,
    });
    expect(card.upgradeEligible).toBe(true);
    expect(card.upgradeReason).toContain("upgrades to Tier 2");
    // Price/rarity/frame facts are not suppressed by the cue.
    expect(card.rarityLabel).toBeTruthy();
    expect(card.framePriority).toContain("rarity");
  });

  it("does not imply an upgrade for a max-tier duplicate (converts to credits)", () => {
    const base = vehicleBuild([CHEAP_ITEM]);
    const tier3 = { ...base, slots: base.slots.map((slot, index) => (index === 0 ? { ...slot, item: CHEAP_ITEM, tier: 3 as const } : slot)) };
    const resolution = resolveDuplicateAcquisition(tier3, CHEAP_ITEM);
    expect(resolution).toEqual({ kind: "max-tier-convert", creditsGained: Math.floor(CHEAP_ITEM.price / 2) });

    const card = cardFeedbackState({ item: CHEAP_ITEM, role: "offer", availability: "available", upgradeEligible: false });
    expect(card.upgradeEligible).toBe(false);
    expect(card.upgradeReason).toBeNull();
  });

  it("keeps rare/selected/upgrade meaning identical under reduced motion", () => {
    const motion = cardFeedbackState({ item: CHEAP_ITEM, role: "offer", availability: "available", upgradeEligible: true, selected: true });
    const reduced = cardFeedbackState({ item: CHEAP_ITEM, role: "offer", availability: "available", upgradeEligible: true, selected: true, reducedMotion: true });
    expect(reduced.motionMode).toBe("reduced");
    expect(reduced.rarityLabel).toBe(motion.rarityLabel);
    expect(reduced.upgradeEligible).toBe(motion.upgradeEligible);
    expect(reduced.selected).toBe(true);
    expect(reduced.framePriority).toEqual(motion.framePriority);
  });
});
