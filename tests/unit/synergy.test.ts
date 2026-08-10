import { describe, expect, it } from "vitest";
import { resolveSynergyEffects } from "../../src/simulation/synergy";
import type { SynergyEffect } from "../../src/simulation/types";
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

    expect(resolution.get("the-highwheel-slot-2")!.appliedDeltaPercent).toBe(5);
    expect(resolution.get("the-highwheel-slot-2")!.applications).toEqual([
      {
        sourceItemId: "source",
        target: { kind: "tag", tag: "gearing" },
        conditionKind: "linear-per-count",
        appliedPercent: 5,
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

    expect(resolution.get("the-highwheel-slot-2")!.appliedDeltaPercent).toBe(8);
    expect(resolution.get("the-highwheel-slot-3")!.appliedDeltaPercent).toBe(0);
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
      expect(entry.appliedDeltaPercent).toBe(0);
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

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toBe(0);
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

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toBe(50);
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

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toBe(0);
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

    expect(resolutionWithTwo.get("the-highwheel-slot-1")!.appliedDeltaPercent).toBe(20);
    expect(resolutionWithOne.get("the-highwheel-slot-1")!.appliedDeltaPercent).toBe(0);
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

    expect(resolution.get("the-highwheel-slot-1")!.appliedDeltaPercent).toBe(0);
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

    expect(targetResolution.appliedDeltaPercent).toBe(8);
    expect(targetResolution.applications).toHaveLength(2);
    expect(targetResolution.applications.map((app) => app.sourceItemId).sort()).toEqual([
      "source-a",
      "source-b",
    ]);
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
