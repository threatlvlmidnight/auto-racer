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
} from "../../src/scenes/itemPresentation";

const ALL_ITEMS = [NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS)].flat();

describe("item stat vocabulary", () => {
  it("uses one stable physical-stat order and abstract units", () => {
    expect(ITEM_STAT_ORDER).toEqual(["acceleration", "topSpeed", "brakingPower", "corneringSpeed", "time"]);
    expect(statDefinition("acceleration")).toMatchObject({ label: "Acceleration", unit: "speed/s" });
    expect(statDefinition("topSpeed")).toMatchObject({ label: "Top Speed", unit: "speed" });
  });

  it("communicates mathematical direction rather than sign alone", () => {
    expect(formatStatDelta("time", -1)).toMatchObject({ direction: "gain", directionLabel: "Gain" });
    expect(formatStatDelta("time", 1)).toMatchObject({ direction: "loss", directionLabel: "Loss" });
    expect(formatStatDelta("topSpeed", 1)).toMatchObject({ direction: "gain", directionLabel: "Gain" });
    expect(formatStatDelta("topSpeed", -1)).toMatchObject({ direction: "loss", directionLabel: "Loss" });
    expect(formatStatDelta("topSpeed", 0)).toMatchObject({ direction: "neutral", directionLabel: "No change" });
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

  it("adapts recorded physical evidence without recomputing its values", () => {
    const item = ALL_ITEMS.find((candidate) => candidate.physics)!;
    const evidence = resolvedItemEvidence(item, { kind: "physical", evidence: {
      lap: 2, sourceItemId: item.id, sourceLocation: { area: "board", index: 0 },
      slotId: "slot", tier: 2, installationState: "fitted", active: true,
      flatResolvedDelta: { topSpeedDelta: 7 }, conditionalResolvedDeltas: [],
      buffApplications: [], synergyApplications: [],
    } });
    expect(evidence).toMatchObject({ lap: 2, tier: 2, active: true, fired: true, evidenceAvailability: "available" });
    expect(evidence.contributionLines[0]).toMatchObject({ statLabel: "Top Speed", effectiveValueLabel: "+7 speed" });
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
