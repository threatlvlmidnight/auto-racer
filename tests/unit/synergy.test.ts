import { describe, expect, it } from "vitest";
import { resolveSynergyEffects } from "../../src/simulation/synergy";
import { ROOK_ITEMS } from "../../src/content/items/rook";
import type { StatTarget, SynergyEffect } from "../../src/simulation/types";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function boostOthersByTag(tag: string, percentPerMatch: number): SynergyEffect {
  return {
    target: { kind: "tag", tag },
    appliesTo: "others",
    condition: { kind: "linear-per-count", percentPerMatch },
    description: `Boosts ${tag} items by ${percentPerMatch}% per matching item.`,
  };
}

function loneCategoryBonus(category: "power" | "chassis", bonusPercent: number): SynergyEffect {
  return {
    target: { kind: "category", category },
    appliesTo: "self",
    condition: { kind: "exact-other-count", count: 0, bonusPercent },
    description: `+${bonusPercent}% if the only ${category} item held.`,
  };
}

describe("resolveSynergyEffects — target matching (US1, FR-001)", () => {
  it("matches by synergyTags and applies a Boost-Others effect to a matching held item", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const target = testItem({
      id: "target",
      name: "Target",
      price: 1,
      timeModifier: -10,
      synergyTags: ["gearing"],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source, target]));

    expect(resolution.get("the-highwheel-slot-2")!.appliedDeltaPercent).toEqual({ time: 5 });
    expect(resolution.get("the-highwheel-slot-2")!.applications).toEqual([
      {
        sourceItemId: "source",
        target: { kind: "tag", tag: "gearing" },
        conditionKind: "linear-per-count",
        appliedPercent: 5,
        targetStat: "time",
        description: source.synergyEffects![0].description,
      },
    ]);
  });

  it("matches by installationCategory", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "category", category: "power" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 8 },
          description: "Boosts Power items by 8%.",
        },
      ],
    });
    const powerItem = testItem({
      id: "power-item",
      name: "Power Item",
      price: 1,
      timeModifier: -4,
      installationCategory: "power",
    });
    const chassisItem = testItem({
      id: "chassis-item",
      name: "Chassis Item",
      price: 1,
      timeModifier: -4,
      installationCategory: "chassis",
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source, powerItem, chassisItem]));

    expect(resolution.get("the-highwheel-slot-2")!.appliedDeltaPercent).toEqual({ time: 8 });
    expect(resolution.get("the-highwheel-slot-3")!.appliedDeltaPercent).toEqual({});
  });

  it("applies no boost anywhere when no held item shares the target (US1 AS2)", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const unrelated = testItem({
      id: "unrelated",
      name: "Unrelated",
      price: 1,
      timeModifier: -2,
      synergyTags: ["momentum"],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source, unrelated]));

    resolution.forEach((entry) => {
      expect(entry.appliedDeltaPercent).toEqual({});
      expect(entry.applications).toEqual([]);
    });
  });
});

describe("resolveSynergyEffects — self-exclusion (FR-006)", () => {
  it("never counts or boosts the source item itself, even when it shares its own target tag", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: -5,
      synergyTags: ["gearing"],
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source]));

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toEqual({});
  });

  it("excludes the source item from its own self-conditional count", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: -5,
      installationCategory: "power",
      synergyEffects: [loneCategoryBonus("power", 50)],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source]));

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toEqual({ time: 50 });
  });
});

describe("resolveSynergyEffects — exact-other-count condition, including count: 0 (FR-004)", () => {
  it("applies the self bonus when the lone-item condition (count: 0) is met", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: -5,
      installationCategory: "power",
      synergyEffects: [loneCategoryBonus("power", 50)],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source]));

    expect(resolution.get("the-highwheel-slot-1")!.applications).toEqual([
      {
        sourceItemId: "source",
        target: { kind: "category", category: "power" },
        conditionKind: "exact-other-count",
        appliedPercent: 50,
        targetStat: "time",
        description: source.synergyEffects![0].description,
      },
    ]);
  });

  it("does not apply the self bonus once the condition's exact count is no longer met", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: -5,
      installationCategory: "power",
      synergyEffects: [loneCategoryBonus("power", 50)],
    });
    const otherPower = testItem({
      id: "other-power",
      name: "Other Power",
      price: 1,
      timeModifier: -3,
      installationCategory: "power",
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source, otherPower]));

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toEqual({});
  });

  it("supports non-zero exact counts, not only the lone-item case", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "self",
          condition: { kind: "exact-other-count", count: 2, bonusPercent: 20 },
          description: "+20% with exactly 2 other gearing items.",
        },
      ],
    });
    const gearA = testItem({ id: "gear-a", name: "Gear A", price: 1, timeModifier: -1, synergyTags: ["gearing"] });
    const gearB = testItem({ id: "gear-b", name: "Gear B", price: 1, timeModifier: -1, synergyTags: ["gearing"] });
    const resolutionWithTwo = resolveSynergyEffects(vehicleBuild([source, gearA, gearB]));
    const resolutionWithOne = resolveSynergyEffects(vehicleBuild([source, gearA]));

    expect(resolutionWithTwo.get("the-highwheel-slot-1")!.appliedDeltaPercent).toEqual({ time: 20 });
    expect(resolutionWithOne.get("the-highwheel-slot-1")!.appliedDeltaPercent).toEqual({});
  });
});

describe("resolveSynergyEffects — active-slot-only counting (FR-005)", () => {
  it("never counts a matching item held in storage", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const storedMatch = testItem({
      id: "stored-match",
      name: "Stored Match",
      price: 1,
      timeModifier: -3,
      synergyTags: ["gearing"],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source], [storedMatch]));

    expect([...resolution.values()].every((entry) => entry.applications.length === 0)).toBe(true);
  });

  it("never resolves a synergy effect authored on an item sitting in storage", () => {
    const storedSource = testItem({
      id: "stored-source",
      name: "Stored Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const target = testItem({
      id: "target",
      name: "Target",
      price: 1,
      timeModifier: -3,
      synergyTags: ["gearing"],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([target], [storedSource]));

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toEqual({});
  });
});

describe("resolveSynergyEffects — multi-effect composition", () => {
  it("applies two different Boost-Others effects targeting the same item, each separately attributed", () => {
    const sourceA = testItem({
      id: "source-a",
      name: "Source A",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const sourceB = testItem({
      id: "source-b",
      name: "Source B",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 3)],
    });
    const target = testItem({
      id: "target",
      name: "Target",
      price: 1,
      timeModifier: -10,
      synergyTags: ["gearing"],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([sourceA, sourceB, target]));
    const targetResolution = resolution.get("the-highwheel-slot-3")!;

    expect(targetResolution.appliedDeltaPercent).toEqual({ time: 8 });
    expect(targetResolution.applications).toHaveLength(2);
    expect(targetResolution.applications.map((app) => app.sourceItemId).sort()).toEqual([
      "source-a",
      "source-b",
    ]);
  });
});

// 023-stat-targeted-amplifiers US1 (T010): SynergyResolution.appliedDeltaPercent
// becomes a per-StatTarget map — one target item can receive boosts to
// different stats from different source items simultaneously.
describe("resolveSynergyEffects — stat-targeted effects (T010, US1, research.md Decision 3)", () => {
  it("targetStat defaults to 'time' when a SynergyEffect omits it", () => {
    const source = testItem({
      id: "source", name: "Source", price: 1, timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const target = testItem({
      id: "target", name: "Target", price: 1, timeModifier: -10, synergyTags: ["gearing"],
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source, target]));

    expect(resolution.get("the-highwheel-slot-2")!.applications[0].targetStat).toBe("time");
  });

  it("accumulates a stat-targeted effect's percent under its own StatTarget key", () => {
    const source = testItem({
      id: "source", name: "Source", price: 1, timeModifier: 0,
      synergyEffects: [{ ...boostOthersByTag("gearing", 12), targetStat: "acceleration" }],
    });
    const target = testItem({
      id: "target", name: "Target", price: 1, timeModifier: 0, synergyTags: ["gearing"],
      physics: { accelerationDelta: 10 },
    });
    const resolution = resolveSynergyEffects(vehicleBuild([source, target]));

    expect(resolution.get("the-highwheel-slot-2")!.appliedDeltaPercent).toEqual({ acceleration: 12 });
  });

  it("a single target item receives boosts to two DIFFERENT stats from two different source items independently", () => {
    const gearingSource = testItem({
      id: "gearing-source", name: "Gearing Source", price: 1, timeModifier: 0,
      synergyEffects: [{ ...boostOthersByTag("gearing", 12), targetStat: "acceleration" }],
    });
    const aeroSource = testItem({
      id: "aero-source", name: "Aero Source", price: 1, timeModifier: 0,
      synergyEffects: [{ ...boostOthersByTag("aerodynamics", 6), targetStat: "topSpeed" }],
    });
    const target = testItem({
      id: "target", name: "Target", price: 1, timeModifier: 0,
      synergyTags: ["gearing", "aerodynamics"],
      physics: { accelerationDelta: 10, topSpeedDelta: 20 },
    });
    const resolution = resolveSynergyEffects(vehicleBuild([gearingSource, aeroSource, target]));
    const targetResolution = resolution.get("the-highwheel-slot-3")!;

    expect(targetResolution.appliedDeltaPercent).toEqual({ acceleration: 12, topSpeed: 6 });
    expect(targetResolution.applications).toHaveLength(2);
  });
});

describe("resolveSynergyEffects — determinism (Validation Invariant 3)", () => {
  it("returns a deeply equal result across repeated calls with an identical build", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const target = testItem({
      id: "target",
      name: "Target",
      price: 1,
      timeModifier: -10,
      synergyTags: ["gearing"],
    });
    const build = vehicleBuild([source, target]);

    expect(resolveSynergyEffects(build)).toEqual(resolveSynergyEffects(build));
  });

  it("never mutates the build it reads", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [boostOthersByTag("gearing", 5)],
    });
    const target = testItem({
      id: "target",
      name: "Target",
      price: 1,
      timeModifier: -10,
      synergyTags: ["gearing"],
    });
    const build = vehicleBuild([source, target]);
    const snapshot = structuredClone(build);
    resolveSynergyEffects(build);

    expect(build).toEqual(snapshot);
  });
});

// 023-stat-targeted-amplifiers Foundational (T002): SynergyEffect.targetStat
// coexists with every existing field; undefined and "time" mean the same
// thing everywhere this field is read.
describe("SynergyEffect.targetStat shape (T002)", () => {
  it("is optional and accepts every StatTarget value", () => {
    const legacyImplicit: SynergyEffect = boostOthersByTag("gearing", 5);
    const legacyExplicit: SynergyEffect = { ...boostOthersByTag("gearing", 5), targetStat: "time" };
    const statTargets: StatTarget[] = ["time", "acceleration", "topSpeed", "brakingPower", "corneringSpeed"];

    expect(legacyImplicit.targetStat).toBeUndefined();
    expect(legacyExplicit.targetStat).toBe("time");
    statTargets.forEach((target) => {
      const effect: SynergyEffect = { ...boostOthersByTag("gearing", 5), targetStat: target };
      expect(effect.targetStat).toBe(target);
    });
  });
});

describe("Feature 032 Interchangeable Test Mounts rule", () => {
  it("applies exactly +50% cornering to itself with exactly two Power items", () => {
    const mounts = ROOK_ITEMS.find((item) => item.id === "rook-interchangeable-test-mounts")!;
    const powerA = testItem({ id: "power-a", name: "Power A", price: 1, timeModifier: 0, installationCategory: "power" });
    const powerB = testItem({ id: "power-b", name: "Power B", price: 1, timeModifier: 0, installationCategory: "power" });
    const build = vehicleBuild([mounts, powerA, powerB]);
    const mountSlot = build.slots[0].slotId;
    expect(resolveSynergyEffects(build).get(mountSlot)?.appliedDeltaPercent.corneringSpeed).toBe(50);
  });
});
