import { describe, expect, it } from "vitest";
import { enumerateHeldItems } from "../../src/simulation/garage";
import { projectScoredRaceRecord } from "../../src/simulation/run";
import {
  economyFixtures,
  fittedValueScaledFixture,
} from "../fixtures/demo-feedback-fixtures";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import type {
  AcquisitionReceipt,
  EconomyContribution,
  LiveStatChange,
  SaleReceipt,
  SaleUndoSnapshot,
  ScoredRaceRecordEntry,
} from "../../src/simulation/types";

/**
 * Feature 032 T008: shape and immutability pins for the new evidence and
 * receipt types (032 data-model.md). Runtime witnesses are the foundation's
 * pure producers/consumers: enumerateHeldItems (garage location evidence)
 * and projectScoredRaceRecord (record projection).
 */

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

describe("held-item location evidence (enumerateHeldItems)", () => {
  const installed = testItem({ id: "held-installed", name: "Installed", price: 4, timeModifier: 0 });
  const stored = testItem({ id: "held-stored", name: "Stored", price: 2, timeModifier: 0 });

  it("enumerates installed items first in slot order, then storage in index order", () => {
    const build = vehicleBuild([installed, null], [stored, null]);
    const entries = enumerateHeldItems(build);

    expect(entries).toHaveLength(2);
    expect(entries[0].item.id).toBe("held-installed");
    expect(entries[0].installed).toBe(true);
    expect(entries[0].location).toEqual({ area: "vehicle", slotId: build.slots[0].slotId });
    expect(entries[1].item.id).toBe("held-stored");
    expect(entries[1].installed).toBe(false);
    expect(entries[1].location).toEqual({ area: "storage", index: 0 });
  });

  it("carries exact tier evidence per position", () => {
    const build = vehicleBuild([installed], [stored]);
    build.slots[0].tier = 3;
    build.storage[0].tier = 2;

    const entries = enumerateHeldItems(build);
    expect(entries[0].tier).toBe(3);
    expect(entries[1].tier).toBe(2);
  });

  it("is a pure read: the build is never mutated and empty positions are skipped", () => {
    const build = vehicleBuild([null, installed], [null, stored]);
    const snapshot = structuredClone(build);

    const entries = enumerateHeldItems(build);

    expect(build).toEqual(snapshot);
    expect(entries.map((entry) => entry.location)).toEqual([
      { area: "vehicle", slotId: build.slots[1].slotId },
      { area: "storage", index: 1 },
    ]);
  });
});

describe("scored-race record projection (projectScoredRaceRecord)", () => {
  const entry = (
    encounterId: string,
    raceKind: ScoredRaceRecordEntry["raceKind"],
    position: number,
  ): ScoredRaceRecordEntry => ({ encounterId, raceKind, position });

  it("classifies positions 1-3 as wins and 4-8 as losses across all race kinds", () => {
    const projection = projectScoredRaceRecord([
      entry("local-1", "local", 1),
      entry("local-2", "local", 3),
      entry("champ-1", "championship", 4),
      entry("champ-2", "championship", 8),
      entry("finale", "elite-finale", 2),
    ]);

    expect(projection.wins).toBe(3);
    expect(projection.losses).toBe(2);
    expect(projection.wins + projection.losses).toBe(5);
  });

  it("counts every retained entry exactly once — no tie bucket, no dropped kinds", () => {
    const entries = Array.from({ length: 8 }, (_, index) =>
      entry(`race-${index + 1}`, "championship", index + 1),
    );
    const projection = projectScoredRaceRecord(entries);

    expect(projection.wins).toBe(3);
    expect(projection.losses).toBe(5);
    expect(projection.entries).toEqual(entries);
  });

  it("is pure and deterministic: identical input yields an identical projection", () => {
    const entries = [entry("a", "local", 1), entry("b", "championship", 5)];
    expect(projectScoredRaceRecord(entries)).toEqual(projectScoredRaceRecord(entries));
  });

  it("rejects out-of-range placements instead of guessing", () => {
    expect(() => projectScoredRaceRecord([entry("bad", "local", 0)])).toThrow();
    expect(() => projectScoredRaceRecord([entry("bad", "local", 9)])).toThrow();
  });
});

describe("receipt and evidence shape pins", () => {
  it("SaleReceipt totals reconcile exactly and survive deep-freeze", () => {
    const contribution: EconomyContribution = {
      sourceItemId: economyFixtures.engineBuildersNameplate.id,
      sourceItemName: economyFixtures.engineBuildersNameplate.name,
      tier: 2,
      heldLocation: { area: "storage", index: 1 },
      trigger: "item-sale",
      amount: 2,
    };
    const receipt: SaleReceipt = deepFreeze({
      itemId: fittedValueScaledFixture.id,
      itemName: fittedValueScaledFixture.name,
      tier: 1,
      priorLocation: { area: "vehicle", slotId: "slot-1" },
      baseValue: 2,
      contributions: [contribution],
      totalPayout: 4,
      creditsBefore: 3,
      creditsAfter: 7,
    });

    const contributionSum = receipt.contributions.reduce((sum, item) => sum + item.amount, 0);
    expect(receipt.totalPayout).toBe(receipt.baseValue + contributionSum);
    expect(receipt.creditsAfter).toBe(receipt.creditsBefore + receipt.totalPayout);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(Object.isFrozen(receipt.contributions)).toBe(true);
  });

  it("SaleUndoSnapshot carries the whole receipt; invalidation never alters it", () => {
    const receipt: SaleReceipt = {
      itemId: "x",
      itemName: "X",
      tier: 1,
      priorLocation: { area: "storage", index: 0 },
      baseValue: 1,
      contributions: [],
      totalPayout: 1,
      creditsBefore: 0,
      creditsAfter: 1,
    };
    const valid: SaleUndoSnapshot = { receipt, valid: true };
    const invalidated: SaleUndoSnapshot = { ...valid, valid: false };

    expect(invalidated.receipt).toBe(valid.receipt);
    expect(invalidated.valid).toBe(false);
  });

  it("LiveStatChange pins the delta invariant presentation relies on", () => {
    const change: LiveStatChange = {
      boundaryId: "boundary-1",
      lap: 2,
      stat: "topSpeed",
      previousValue: 40,
      currentValue: 46,
      delta: 6,
      direction: "up",
      sourceItemId: "source",
      sourceItemName: "Source Item",
      amplifierSources: [
        {
          sourceItemId: "amp",
          sourceItemName: "Amplifier",
          magnitudePercent: 15,
          affectedContributionLabel: "Source Item top-speed effect",
        },
      ],
    };

    expect(change.delta).toBe(change.currentValue - change.previousValue);
    expect(change.direction).toBe(change.delta >= 0 ? "up" : "down");
  });

  it("AcquisitionReceipt distinguishes purchased/upgraded/unavailable slots", () => {
    const upgraded: AcquisitionReceipt = {
      offerId: "offer-2",
      status: "upgraded",
      itemId: "item",
      itemName: "Item",
      oldTier: 1,
      newTier: 2,
      changedEffects: [{ label: "Effect", oldValue: "+6", newValue: "+6.9" }],
    };
    const unavailable: AcquisitionReceipt = {
      offerId: "offer-1",
      status: "unavailable",
      itemId: "item",
      itemName: "Item",
      oldTier: null,
      newTier: null,
      changedEffects: [],
    };

    expect(upgraded.changedEffects).toHaveLength(1);
    expect(unavailable.newTier).toBeNull();
  });
});

