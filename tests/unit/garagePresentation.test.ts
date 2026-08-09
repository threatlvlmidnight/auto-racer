import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import { garageItemInspector } from "../../src/scenes/garagePresentation";

const POWER_FITTED = ITEM_POOL.find((item) => item.id === "item-001")!; // Power, Fitted time-modifier
const CHASSIS_NO_CONSEQUENCE = ITEM_POOL.find((item) => item.id === "item-003")!; // Chassis, Improvised "none"
const STORED_BUFF = ITEM_POOL.find((item) => item.id === "item-013")!; // activeWhileStored
const BUFF_ITEM = ITEM_POOL.find((item) => item.id === "item-012")!; // Power buff item

describe("garageItemInspector", () => {
  it("reports origin, category, synergy tags, price, and affordability at a glance", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", 10);

    expect(inspector.id).toBe(POWER_FITTED.id);
    expect(inspector.name).toBe(POWER_FITTED.name);
    expect(inspector.originLabel.toLowerCase()).toBe(POWER_FITTED.origin);
    expect(inspector.categoryLabel).toBe("POWER");
    expect(inspector.synergyTags).toEqual(POWER_FITTED.synergyTags);
    expect(inspector.priceLabel).toContain(String(POWER_FITTED.price));
    expect(inspector.affordable).toBe(true);
  });

  it("reports unaffordable when the price exceeds available credits", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", POWER_FITTED.price - 1);
    expect(inspector.affordable).toBe(false);
  });

  it("discloses the gained Fitted behavior in a matching-category slot", () => {
    const inspector = garageItemInspector(POWER_FITTED, "power", 10);

    expect(inspector.installationState).toBe("fitted");
    expect(inspector.gainedBehaviorLabel).toBe(POWER_FITTED.fittedBehavior.description);
    expect(inspector.lostBehaviorLabel).toBeNull();
    expect(inspector.noAdditionalConsequenceLabel).toBeNull();
  });

  it("discloses the lost Fitted behavior and gained Improvised consequence in a conflicting slot", () => {
    const inspector = garageItemInspector(POWER_FITTED, "chassis", 10);

    expect(inspector.installationState).toBe("improvised");
    expect(inspector.gainedBehaviorLabel).toBe(POWER_FITTED.improvisedBehavior.description);
    expect(inspector.lostBehaviorLabel).toBe(POWER_FITTED.fittedBehavior.description);
    expect(inspector.noAdditionalConsequenceLabel).toBeNull();
  });

  it("discloses an explicit no-additional-consequence text instead of inventing a penalty", () => {
    const inspector = garageItemInspector(CHASSIS_NO_CONSEQUENCE, "power", 10);

    expect(inspector.installationState).toBe("improvised");
    expect(inspector.gainedBehaviorLabel).toBeNull();
    expect(inspector.lostBehaviorLabel).toBe(CHASSIS_NO_CONSEQUENCE.fittedBehavior.description);
    expect(inspector.noAdditionalConsequenceLabel).not.toBeNull();
  });

  it("reports base-only behavior with no gain or loss in a Flex slot", () => {
    const inspector = garageItemInspector(POWER_FITTED, "flex", 10);

    expect(inspector.installationState).toBe("flexible");
    expect(inspector.gainedBehaviorLabel).toBeNull();
    expect(inspector.lostBehaviorLabel).toBe(POWER_FITTED.fittedBehavior.description);
  });

  it("omits installation state entirely for a storage destination", () => {
    const inspector = garageItemInspector(STORED_BUFF, null, 10);

    expect(inspector.installationState).toBeNull();
    expect(inspector.gainedBehaviorLabel).toBeNull();
    expect(inspector.lostBehaviorLabel).toBeNull();
    expect(inspector.storageBehaviorLabel.toLowerCase()).toContain("active");
  });

  it("labels an item that goes inert in storage distinctly from one that stays active", () => {
    expect(garageItemInspector(STORED_BUFF, null, 10).storageBehaviorLabel.toLowerCase()).toContain("active");
    expect(garageItemInspector(POWER_FITTED, null, 10).storageBehaviorLabel.toLowerCase()).toContain("inert");
  });

  it("reports a readable cooldown/trigger label for both direct and buff items", () => {
    expect(garageItemInspector(POWER_FITTED, "power", 10).cooldownLabel.length).toBeGreaterThan(0);
    expect(garageItemInspector(BUFF_ITEM, "power", 10).cooldownLabel.length).toBeGreaterThan(0);
  });
});
