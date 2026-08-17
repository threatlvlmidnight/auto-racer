import { describe, expect, it } from "vitest";
import { buildWorkshopModification, type ModificationSpec } from "../../src/content/itemModifications";
import {
  attachModification,
  clearModification,
  compatibilityFor,
  modificationPointsFor,
  offeredModificationsFor,
  resolveModificationEffect,
} from "../../src/simulation/itemModifications";
import { createItemInstance } from "../../src/simulation/itemInstances";
import type { ItemDefinition } from "../../src/simulation/types";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import { PHYSICAL_UNITS_PER_CANONICAL_POINT } from "../../src/simulation/statNormalization";

function accelerationItem(accelerationDelta: number): ItemDefinition {
  return testItem({
    id: "engine",
    name: "Engine",
    price: 3,
    timeModifier: -1,
    physics: { accelerationDelta },
  });
}

describe("resolveModificationEffect — behavior families (T031/T034, FR-044)", () => {
  it("stat-graft adds N target points where N is the tier-1 source contribution (FR-043)", () => {
    const item = accelerationItem(4);
    const graft = buildWorkshopModification("graft-accel-into-cornering", "factory-1", 5);
    const effect = resolveModificationEffect(graft, item);
    expect(effect.points.acceleration).toBe(0);
    expect(effect.points.corneringSpeed).toBe(4 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration);
    expect(effect.guardedOncePerRace).toBe(false);
    expect(effect.adaptedMount).toBe(false);
  });

  it("twin-tuned adds the authored base so the total contribution doubles", () => {
    const item = accelerationItem(6);
    const twin = buildWorkshopModification("twin-tuned", "factory-2", 3);
    const effect = resolveModificationEffect(twin, item);
    expect(effect.points.acceleration).toBe(6 / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration);
    expect(effect.points.topSpeed).toBe(0);
  });

  it("guarded converts the first overtake into a defended attempt once per race", () => {
    const guarded = buildWorkshopModification("guarded", "factory-3", 2);
    const effect = resolveModificationEffect(guarded, accelerationItem(2));
    expect(effect.guardedOncePerRace).toBe(true);
  });

  it("adapted-mount retains Fitted behavior while installed Improvised", () => {
    const mount = buildWorkshopModification("adapted-mount", "factory-4", 1);
    const effect = resolveModificationEffect(mount, accelerationItem(2));
    expect(effect.adaptedMount).toBe(true);
  });
});

describe("compatibilityFor — legal, non-no-op (T031/SC-010)", () => {
  it("stat-graft is illegal/no-op when the source stat is absent or equals the target", () => {
    const neutral = testItem({ id: "noop", name: "Noop", price: 1, timeModifier: 0 });
    const graft: ModificationSpec = { modificationId: "graft-accel-into-cornering", kind: "stat-graft", sourceStat: "acceleration", targetStat: "corneringSpeed", presentationKey: "x" };
    expect(compatibilityFor(neutral, graft).legal).toBe(false);
    expect(compatibilityFor(neutral, graft).noOp).toBe(true);
    const same: ModificationSpec = { ...graft, sourceStat: "acceleration", targetStat: "acceleration" };
    expect(compatibilityFor(accelerationItem(3), same).legal).toBe(false);
  });

  it("twin-tuned requires a physical contribution", () => {
    const twin = { modificationId: "twin-tuned", kind: "twin-tuned" as const, presentationKey: "x" };
    expect(compatibilityFor(accelerationItem(2), twin).legal).toBe(true);
    const np = testItem({ id: "none", name: "None", price: 1, timeModifier: -1 });
    expect(compatibilityFor(np, twin).legal).toBe(false);
  });

  it("adaptation requires a non-none Fitted behavior", () => {
    const mount = { modificationId: "adapted-mount", kind: "adapted-mount" as const, presentationKey: "x" };
    const improvisedDriven = testItem({
      id: "fitted",
      name: "Fitted",
      price: 1,
      timeModifier: 0,
      fittedBehavior: { kind: "time-modifier", description: "fitted", timeModifier: -1 },
    });
    expect(compatibilityFor(improvisedDriven, mount).legal).toBe(true);
    expect(compatibilityFor(testItem({ id: "n", name: "N", price: 1, timeModifier: 0 }), mount).legal).toBe(false);
  });

  it("offeredModificationsFor returns only legal, non-no-op options", () => {
    const offers = offeredModificationsFor(accelerationItem(4));
    expect(offers.length).toBeGreaterThan(0);
    offers.forEach((offer) => {
      const result = compatibilityFor(accelerationItem(4), offer);
      expect(result.legal).toBe(true);
      expect(result.noOp).toBe(false);
    });
  });
});

describe("attachModification / clearModification / modificationPointsFor (T031)", () => {
  it("binds a modification to an instance and replaces any previous one", () => {
    const item = accelerationItem(4);
    const instance = createItemInstance(item.id, "encounter", 1);
    const guarded = buildWorkshopModification("guarded", "factory-9", 9);
    const attached = attachModification(instance, guarded);
    expect(attached.modification?.kind).toBe("guarded");
    const derived = modificationPointsFor(attached, item);
    expect(Object.values(derived).every((value) => value === 0)).toBe(true);
  });

  it("clears the modification (sale/surrender/rebuild path)", () => {
    const instance = attachModification(createItemInstance("engine", "draft", 1), buildWorkshopModification("twin-tuned", "e", 1));
    const cleared = clearModification(instance);
    expect(cleared.modification).toBeNull();
  });
});
