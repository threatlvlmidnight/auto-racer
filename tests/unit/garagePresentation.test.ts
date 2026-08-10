import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import { garageItemInspector } from "../../src/scenes/garagePresentation";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const POWER_FITTED = ITEM_POOL.find((item) => item.id === "item-001")!; // Power, Fitted time-modifier
const CHASSIS_NO_CONSEQUENCE = ITEM_POOL.find((item) => item.id === "item-003")!; // Chassis, Improvised "none"
const STORED_BUFF = ITEM_POOL.find((item) => item.id === "item-013")!; // activeWhileStored
const BUFF_ITEM = ITEM_POOL.find((item) => item.id === "item-012")!; // Power buff item
const EMPTY_BUILD = vehicleBuild();

describe("garageItemInspector", () => {
  it("reports origin, category, synergy tags, price, and affordability at a glance", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", 10, EMPTY_BUILD);

    expect(inspector.id).toBe(POWER_FITTED.id);
    expect(inspector.name).toBe(POWER_FITTED.name);
    expect(inspector.originLabel.toLowerCase()).toBe(POWER_FITTED.origin);
    expect(inspector.categoryLabel).toBe("POWER");
    expect(inspector.synergyTags).toEqual(POWER_FITTED.synergyTags);
    expect(inspector.priceLabel).toContain(String(POWER_FITTED.price));
    expect(inspector.affordable).toBe(true);
  });

  it("reports unaffordable when the price exceeds available credits", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", POWER_FITTED.price - 1, EMPTY_BUILD);
    expect(inspector.affordable).toBe(false);
  });

  it("discloses the gained Fitted behavior in a matching-category slot", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", 10, EMPTY_BUILD);

    expect(inspector.installationState).toBe("fitted");
    expect(inspector.gainedBehaviorLabel).toBe(POWER_FITTED.fittedBehavior.description);
    expect(inspector.lostBehaviorLabel).toBeNull();
    expect(inspector.noAdditionalConsequenceLabel).toBeNull();
  });

  it("discloses the lost Fitted behavior and gained Improvised consequence in a conflicting slot", () => {
    const inspector = garageItemInspector(POWER_FITTED, "chassis", 10, EMPTY_BUILD);

    expect(inspector.installationState).toBe("improvised");
    expect(inspector.gainedBehaviorLabel).toBe(POWER_FITTED.improvisedBehavior.description);
    expect(inspector.lostBehaviorLabel).toBe(POWER_FITTED.fittedBehavior.description);
    expect(inspector.noAdditionalConsequenceLabel).toBeNull();
  });

  it("discloses an explicit no-additional-consequence text instead of inventing a penalty", () => {
    const inspector = garageItemInspector(CHASSIS_NO_CONSEQUENCE, "power", 10, EMPTY_BUILD);

    expect(inspector.installationState).toBe("improvised");
    expect(inspector.gainedBehaviorLabel).toBeNull();
    expect(inspector.lostBehaviorLabel).toBe(CHASSIS_NO_CONSEQUENCE.fittedBehavior.description);
    expect(inspector.noAdditionalConsequenceLabel).not.toBeNull();
  });

  it("reports base-only behavior with no gain or loss in a Flex slot", () => {
    const inspector = garageItemInspector(POWER_FITTED, "flex", 10, EMPTY_BUILD);

    expect(inspector.installationState).toBe("flexible");
    expect(inspector.gainedBehaviorLabel).toBeNull();
    expect(inspector.lostBehaviorLabel).toBe(POWER_FITTED.fittedBehavior.description);
  });

  it("omits installation state entirely for a storage destination", () => {
    const inspector = garageItemInspector(STORED_BUFF, null, 10, EMPTY_BUILD);

    expect(inspector.installationState).toBeNull();
    expect(inspector.gainedBehaviorLabel).toBeNull();
    expect(inspector.lostBehaviorLabel).toBeNull();
    expect(inspector.storageBehaviorLabel.toLowerCase()).toContain("active");
  });

  it("labels an item that goes inert in storage distinctly from one that stays active", () => {
    expect(garageItemInspector(STORED_BUFF, null, 10, EMPTY_BUILD).storageBehaviorLabel.toLowerCase()).toContain("active");
    expect(garageItemInspector(POWER_FITTED, null, 10, EMPTY_BUILD).storageBehaviorLabel.toLowerCase()).toContain("inert");
  });

  it("reports a readable cooldown/trigger label for both direct and buff items", () => {
    expect(garageItemInspector(POWER_FITTED, "power", 10, EMPTY_BUILD).cooldownLabel.length).toBeGreaterThan(0);
    expect(garageItemInspector(BUFF_ITEM, "power", 10, EMPTY_BUILD).cooldownLabel.length).toBeGreaterThan(0);
  });
});

describe("garageItemInspector — live synergy display (014 US3, FR-009)", () => {
  it("returns an empty synergyEffects array for an item with no authored synergy effects", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", 10, EMPTY_BUILD);
    expect(inspector.synergyEffects).toEqual([]);
  });

  it("shows a Boost-Others effect as applying, with a live match count, when a matching item is held", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 5 },
          description: "Boosts gearing items by 5% per matching item.",
        },
      ],
    });
    const match = testItem({ id: "match", name: "Match", price: 1, timeModifier: -5, synergyTags: ["gearing"] });
    const build = vehicleBuild([match]);
    const inspector = garageItemInspector(source, "power", 10, build);

    expect(inspector.synergyEffects).toHaveLength(1);
    expect(inspector.synergyEffects[0]).toMatchObject({
      target: { kind: "tag", tag: "gearing" },
      currentMatchCount: 1,
      applies: true,
    });
    expect(inspector.synergyEffects[0].targetLabel.toLowerCase()).toContain("gearing");
    expect(inspector.synergyEffects[0].currentValueLabel.length).toBeGreaterThan(0);
  });

  it("shows a Boost-Others effect as not applying when nothing currently held matches its target", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 5 },
          description: "Boosts gearing items by 5% per matching item.",
        },
      ],
    });
    const inspector = garageItemInspector(source, "power", 10, EMPTY_BUILD);

    expect(inspector.synergyEffects[0]).toMatchObject({ currentMatchCount: 0, applies: false });
  });

  it("live-updates a Self-Conditional lone-item effect as applying alone and not applying once paired", () => {
    const loneItem = testItem({
      id: "lone",
      name: "Lone",
      price: 1,
      timeModifier: -4,
      installationCategory: "power",
      synergyEffects: [
        {
          target: { kind: "category", category: "power" },
          appliesTo: "self",
          condition: { kind: "exact-other-count", count: 0, bonusPercent: 50 },
          description: "+50% if the only Power item held.",
        },
      ],
    });
    const otherPower = testItem({ id: "other-power", name: "Other Power", price: 1, timeModifier: -2, installationCategory: "power" });

    const alone = garageItemInspector(loneItem, "power", 10, vehicleBuild([loneItem]));
    expect(alone.synergyEffects[0]).toMatchObject({ currentMatchCount: 0, applies: true });

    const paired = garageItemInspector(loneItem, "power", 10, vehicleBuild([loneItem, otherPower]));
    expect(paired.synergyEffects[0]).toMatchObject({ currentMatchCount: 1, applies: false });
  });

  it("excludes the inspected item itself from its own live match count when it is already held", () => {
    const source = testItem({
      id: "source",
      name: "Source",
      price: 1,
      timeModifier: 0,
      synergyTags: ["gearing"],
      synergyEffects: [
        {
          target: { kind: "tag", tag: "gearing" },
          appliesTo: "others",
          condition: { kind: "linear-per-count", percentPerMatch: 5 },
          description: "Boosts gearing items by 5% per matching item.",
        },
      ],
    });
    const build = vehicleBuild([source]);
    const inspector = garageItemInspector(source, "power", 10, build);

    expect(inspector.synergyEffects[0]).toMatchObject({ currentMatchCount: 0, applies: false });
  });
});
