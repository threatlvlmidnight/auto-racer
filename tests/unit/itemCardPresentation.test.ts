import { describe, expect, it } from "vitest";
import { compactItemModel, itemInspectorModel, itemRarityDisplay } from "../../src/scenes/itemPresentation";
import { mixedRarityCards } from "../fixtures/interface-clarity-fixtures";

describe("Feature 035 item-card rarity display (T026)", () => {
  it("exposes rarity structure on compact cards", () => {
    const [standard, notable, rare] = mixedRarityCards();
    expect(compactItemModel(standard, { surface: "garage-slot", tier: 1 }).rarityLabel).toBe("Standard");
    expect(compactItemModel(notable, { surface: "garage-slot", tier: 1 }).rarityLabel).toBe("Notable");
    expect(compactItemModel(rare, { surface: "garage-slot", tier: 1 }).rarityLabel).toBe("Rare");
  });

  it("exposes rarity on inspectors with non-color frame/accessibility structure", () => {
    const rare = mixedRarityCards()[2];
    const model = itemInspectorModel(rare, { surface: "supplier-offer", tier: 1, priceVisible: true, credits: 10 });
    expect(model.identity.rarityLabel).toBe("Rare");
    expect(model.identity.rarityFrame).toBe("ornate");
    expect(model.identity.rarityA11yToken).toBeTruthy();
  });

  it("itemRarityDisplay returns stable text/structure, never color-only", () => {
    const [standard, , rare] = mixedRarityCards();
    const s = itemRarityDisplay(standard);
    const r = itemRarityDisplay(rare);
    expect(s.label).toBe("Standard");
    expect(r.label).toBe("Rare");
    expect(s.frame).not.toBe(r.frame);
    expect(r.frame).toBe("ornate");
  });
});
