import { describe, expect, it } from "vitest";
import { NEUTRAL_ITEMS } from "../../src/content/items";
import { poolForEntrant } from "../../src/simulation/itemPools";
import {
  chooseEncounter,
  purchaseStock,
  restockSupplier,
  type PartsSupplierPayload,
} from "../../src/simulation/encounters";
import { createRun, RunTransitionError, runIdentityForEntrant } from "../../src/simulation/run";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

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
  it("BASELINE-GAP: restock currently keeps purchased entries in place (partial restock)", () => {
    const active = activateSupplier(rngSelecting(CHEAP_ITEM.id));
    const payload = active.activeEncounter!.payload as PartsSupplierPayload;
    const target = payload.stock[0];

    const purchased = purchaseStock(active, active.activeEncounter!.id, target.id, {
      area: "vehicle",
      slotId: active.build.slots[0].slotId,
    });
    const purchasedStock = (purchased.activeEncounter!.payload as PartsSupplierPayload).stock[0];
    const restocked = restockSupplier(purchased, purchased.activeEncounter!.id, () => 0.99);
    const after = restocked.activeEncounter!.payload as PartsSupplierPayload;

    // Current behavior: the purchased entry is exempt from replacement.
    // T051 changes this: restock must atomically replace all three slots
    // with fresh purchasable offers. Replace this assertion then.
    expect(after.stock[0]).toEqual(purchasedStock);
    expect(after.stock[0].state).toBe("purchased");
    expect(after.restockUsed).toBe(true);
  });
});

describe("Duplicate-tier feedback gap", () => {
  it("BASELINE-GAP: duplicate purchase tiers up but exposes no old/new receipt", () => {
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
    // ...but the retained surface carries no receipt naming old tier, new
    // tier, or changed effect values — the payload only records purchased
    // item ids. That receipt is what T052/T054 add; pin the absence so the
    // gap cannot be silently half-fixed.
    const after = second.activeEncounter!.payload as PartsSupplierPayload;
    expect(after.purchases).toEqual([CHEAP_ITEM.id, CHEAP_ITEM.id]);
    expect(after).not.toHaveProperty("receipts");
    expect(after).not.toHaveProperty("tierReceipts");
  });
});
