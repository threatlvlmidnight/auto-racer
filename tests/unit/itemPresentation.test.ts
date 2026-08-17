import { describe, expect, it } from "vitest";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import {
  ITEM_STAT_ORDER,
  buildItemLayout,
  compactItemModel,
  createItemSelectionState,
  formatStatDelta,
  inspectedItemId,
  itemInspectorModel,
  reduceItemSelection,
  resolvedItemEvidence,
  statDefinition,
  unresolvedPhysicalEvidence,
  IDLE_TAG_INSPECTION,
  reduceTagInspection,
  tagInspectionProjection,
} from "../../src/scenes/itemPresentation";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";
import { itemTagVisualMetadata } from "../../src/scenes/itemVisualDescriptor";
import { placementBehaviorInventory } from "../fixtures/item-presentation-fixtures";

const ALL_ITEMS = [NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS)].flat();

describe("item stat vocabulary", () => {
  it("uses one stable canonical-stat order and point units", () => {
    expect(ITEM_STAT_ORDER).toEqual(["acceleration", "topSpeed", "brakingPower", "corneringSpeed", "time"]);
    expect(statDefinition("acceleration")).toMatchObject({ label: "Acceleration", unit: "pt" });
    expect(statDefinition("topSpeed")).toMatchObject({ label: "Top Speed", unit: "pt" });
  });

  it("communicates mathematical direction rather than sign alone", () => {
    expect(formatStatDelta("time", -1)).toMatchObject({ direction: "gain", directionLabel: "Gain" });
    expect(formatStatDelta("time", 1)).toMatchObject({ direction: "loss", directionLabel: "Loss" });
    expect(formatStatDelta("topSpeed", 1)).toMatchObject({ direction: "gain", directionLabel: "Gain" });
    expect(formatStatDelta("topSpeed", -1)).toMatchObject({ direction: "loss", directionLabel: "Loss" });
    expect(formatStatDelta("topSpeed", 0)).toMatchObject({ direction: "neutral", directionLabel: "No change" });
  });
});

describe("catalog authored tags", () => {
  it("has a unique accessible token and readable label for every catalog tag", () => {
    const tags = [...new Set([...NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS).flat()].flatMap((item) => item.synergyTags))];
    const metadata = tags.map(itemTagVisualMetadata);
    expect(metadata.every((entry) => entry.label.length > 0)).toBe(true);
    expect(new Set(metadata.map((entry) => entry.iconToken)).size).toBe(tags.length);
  });
});

describe("item presentation catalog coverage", () => {
  it("formats every one of the 70 authored items deterministically", () => {
    expect(ALL_ITEMS).toHaveLength(70);
    ALL_ITEMS.forEach((item) => {
      const context = { surface: "reward-offer" as const, tier: 1 as const, priceVisible: true, credits: 3 };
      const first = compactItemModel(item, context);
      expect(compactItemModel(item, context)).toEqual(first);
      expect(first.name).toBe(item.name);
      expect(first.effectLines.length).toBeGreaterThan(0);
      expect(first.accessibilityLabel).toContain(item.name);
      expect(itemInspectorModel(item, context).identity.itemId).toBe(item.id);
    });
  });

  it("keeps every side of a physical tradeoff visible", () => {
    const item = ALL_ITEMS.find((candidate) => {
      const values = Object.values(candidate.physics ?? {}).filter((value): value is number => typeof value === "number");
      return values.some((value) => value > 0) && values.some((value) => value < 0);
    })!;
    const model = compactItemModel(item, { surface: "reward-offer", tier: 1 });
    expect(model.effectLines.some((line) => line.direction === "gain")).toBe(true);
    expect(model.effectLines.some((line) => line.direction === "loss")).toBe(true);
  });

  it("connects conditional effects to WHEN rules", () => {
    const item = ALL_ITEMS.find((candidate) => candidate.conditionalPhysics?.length)!;
    const model = compactItemModel(item, { surface: "reward-offer", tier: 1 });
    expect(model.effectLines.some((line) => line.conditionLabel?.startsWith("WHEN"))).toBe(true);
  });

  it("names target and cadence for stacking buffs", () => {
    const item = ALL_ITEMS.find((candidate) => candidate.buff && candidate.cooldown !== undefined)!;
    const model = compactItemModel(item, { surface: "reward-offer", tier: 1 });
    expect(model.effectLines[0].statLabel).toContain("Boost");
    expect(model.effectLines[0].conditionLabel).toContain("EVERY");
  });

  it("distinguishes authored and tier-adjusted values", () => {
    const item = ALL_ITEMS.find((candidate) => candidate.physics)!;
    const inspector = itemInspectorModel(item, { surface: "garage-slot", tier: 3 });
    expect(inspector.identity.tierLabel).toBe("Tier 3");
    expect(inspector.effects.some((effect) => effect.authoredValueLabel !== effect.effectiveValueLabel)).toBe(true);
  });
});

describe("selection, layout, and unavailable evidence", () => {
  it("restores persistent selection after transient previews clear", () => {
    expect(inspectedItemId({ selectedItemId: "selected", hoverPreviewItemId: "hover", focusedItemId: null, placementDestinationKey: null, inspectedLap: null })).toBe("hover");
    expect(inspectedItemId({ selectedItemId: "selected", hoverPreviewItemId: null, focusedItemId: null, placementDestinationKey: null, inspectedLap: null })).toBe("selected");
  });

  it("supports persistent selection, transient preview, dismissal, lap sync, and stale cleanup", () => {
    let state = createItemSelectionState();
    state = reduceItemSelection(state, { type: "select", itemId: "kept" });
    state = reduceItemSelection(state, { type: "hover", itemId: "preview" });
    expect(inspectedItemId(state)).toBe("preview");
    state = reduceItemSelection(state, { type: "hover", itemId: null });
    state = reduceItemSelection(state, { type: "lap", lap: 4 });
    expect(inspectedItemId(state)).toBe("kept");
    expect(state.inspectedLap).toBe(4);
    state = reduceItemSelection(state, { type: "reconcile", availableItemIds: ["other"] });
    expect(inspectedItemId(state)).toBeNull();
    expect(reduceItemSelection(state, { type: "dismiss" })).toEqual(createItemSelectionState());
  });

  it("adapts recorded physical evidence into comparable canonical points", () => {
    const item = ALL_ITEMS.find((candidate) => candidate.physics)!;
    const evidence = resolvedItemEvidence(item, { kind: "physical", evidence: {
      lap: 2, sourceItemId: item.id, sourceLocation: { area: "board", index: 0 },
      slotId: "slot", tier: 2, installationState: "fitted", active: true,
      flatResolvedDelta: { topSpeedDelta: 7 }, conditionalResolvedDeltas: [],
      buffApplications: [], synergyApplications: [],
    } });
    expect(evidence).toMatchObject({ lap: 2, tier: 2, active: true, fired: true, evidenceAvailability: "available" });
    expect(evidence.contributionLines[0]).toMatchObject({ statLabel: "Top Speed", effectiveValueLabel: "+53.85 pt" });
  });

  it.each([[800, 450], [1920, 1080], [1366, 768], [1024, 768], [390, 844]])("keeps layout inside %sx%s", (width, height) => {
    const layout = buildItemLayout({ width, height }, 10);
    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.regions.every((region) => region.textPx >= 10)).toBe(true);
  });

  it("does not mislabel unavailable Test Day physics as zero", () => {
    const item = ALL_ITEMS.find((candidate) => candidate.physics)!;
    const evidence = unresolvedPhysicalEvidence(item, 1, 1);
    expect(evidence.evidenceAvailability).toBe("not-evaluated");
    expect(evidence.inactiveReason).toBe("Not evaluated in this Test Day");
    expect(evidence.contributionLines).toEqual([]);
  });
});

// --- Feature 032 T009: tag-inspection reducer and matching projection ----

describe("tag inspection reducer (032 contract §2)", () => {
  it("starts idle and previews on hover", () => {
    const previewed = reduceTagInspection(IDLE_TAG_INSPECTION, { kind: "hover", tag: "airflow" });
    expect(previewed).toEqual({ mode: "preview", tag: "airflow" });
  });

  it("pins on explicit selection and hover never overwrites a pin", () => {
    const pinned = reduceTagInspection(IDLE_TAG_INSPECTION, { kind: "pin", tag: "airflow" });
    expect(pinned).toEqual({ mode: "pinned", tag: "airflow" });

    const hovered = reduceTagInspection(pinned, { kind: "hover", tag: "heat" });
    expect(hovered).toBe(pinned);
    const left = reduceTagInspection(pinned, { kind: "leave" });
    expect(left).toBe(pinned);
  });

  it("pinning another tag moves the pin; unpin returns to the idle singleton", () => {
    const first = reduceTagInspection(IDLE_TAG_INSPECTION, { kind: "pin", tag: "airflow" });
    const second = reduceTagInspection(first, { kind: "pin", tag: "heat" });
    expect(second).toEqual({ mode: "pinned", tag: "heat" });

    expect(reduceTagInspection(second, { kind: "unpin" })).toBe(IDLE_TAG_INSPECTION);
    expect(reduceTagInspection({ mode: "preview", tag: "heat" }, { kind: "leave" }))
      .toBe(IDLE_TAG_INSPECTION);
  });
});

describe("tag inspection matching projection (032 FR-004B)", () => {
  const airflowInstalled = testItem({
    id: "tag-installed", name: "Installed Airflow", price: 2, timeModifier: 0, synergyTags: ["airflow"],
  });
  const airflowStored = testItem({
    id: "tag-stored", name: "Stored Airflow", price: 2, timeModifier: 0, synergyTags: ["airflow"],
  });
  const unrelated = testItem({
    id: "tag-other", name: "Heat Item", price: 2, timeModifier: 0, synergyTags: ["heat"],
  });

  it("matches every held item on board and storage with exact locations", () => {
    const build = vehicleBuild([airflowInstalled, unrelated], [airflowStored]);
    const projection = tagInspectionProjection("airflow", "Airflow", build);

    expect(projection.label).toBe("Airflow");
    expect(projection.matchingHeldCount).toBe(2);
    expect(projection.matchingLocations).toEqual([
      { location: { area: "vehicle", slotId: build.slots[0].slotId }, itemId: "tag-installed" },
      { location: { area: "storage", index: 0 }, itemId: "tag-stored" },
    ]);
  });

  it("never counts the inspecting surface's own scan twice and reports zero cleanly", () => {
    const build = vehicleBuild([unrelated]);
    const projection = tagInspectionProjection("airflow", "Airflow", build);
    expect(projection.matchingHeldCount).toBe(0);
    expect(projection.matchingLocations).toEqual([]);
  });

  it("is a pure read: the build is never mutated", () => {
    const build = vehicleBuild([airflowInstalled], [airflowStored]);
    const snapshot = structuredClone(build);
    tagInspectionProjection("airflow", "Airflow", build);
    expect(build).toEqual(snapshot);
  });
});
describe("Feature 034 placement-behavior inventory (T004/FR-040)", () => {
  it("inventories every playable item with its authored Fitted/Improvised behavior", () => {
    const inventory = placementBehaviorInventory();
    const expectedCount = NEUTRAL_ITEMS.length + Object.values(EXCLUSIVE_ITEMS).flat().length;
    expect(inventory).toHaveLength(expectedCount);
    expect(new Set(inventory.map((entry) => entry.itemId)).size).toBe(expectedCount);
    inventory.forEach((entry) => {
      expect(["time-modifier", "buff-boost", "none"]).toContain(entry.fittedBehaviorKind);
      expect(["time-modifier", "buff-boost", "none"]).toContain(entry.improvisedBehaviorKind);
      expect(typeof entry.fittedDescription).toBe("string");
      expect(typeof entry.improvisedDescription).toBe("string");
    });
  });
});


describe("Feature 034 per-item placement-preview corpus gate (T049)", () => {
  it("every playable item carries a legible, non-placeholder Fitted/Improvised preview", () => {
    const inventory = placementBehaviorInventory();
    inventory.forEach((entry) => {
      expect(entry.fittedDescription.length, `${entry.itemId} fitted`).toBeGreaterThan(0);
      expect(entry.improvisedDescription.length, `${entry.itemId} improvised`).toBeGreaterThan(0);
      expect(entry.fittedDescription).not.toMatch(/TODO|TBD|placeholder|FIXME/i);
      expect(entry.improvisedDescription).not.toMatch(/TODO|TBD|placeholder|FIXME/i);
    });
  });
});
