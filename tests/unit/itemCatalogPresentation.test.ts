import { describe, expect, it } from "vitest";
import { allItemDefinitions, validateItemPools } from "../../src/simulation/itemPools";
import { RARITY_SEMANTICS, type ItemRarity } from "../../src/simulation/types";
import { mixedRarityCards } from "../fixtures/interface-clarity-fixtures";

const RARITIES: readonly ItemRarity[] = ["standard", "notable", "rare"];

describe("Feature 035 catalog presentation (T004/T007)", () => {
  const catalog = allItemDefinitions();

  it("inventories every playable catalog item with an explicit closed rarity", () => {
    expect(catalog.length).toBe(70);
    const seen = new Map<ItemRarity, number>();
    for (const item of catalog) {
      expect(RARITIES).toContain(item.rarity);
      expect(RARITY_SEMANTICS[item.rarity]).toBeDefined();
      seen.set(item.rarity, (seen.get(item.rarity) ?? 0) + 1);
    }
    // All three rarities are present in the authored catalog.
    expect(seen.size).toBe(3);
    for (const rarity of RARITIES) expect((seen.get(rarity) ?? 0)).toBeGreaterThan(0);
  });

  it("keeps the existing pool/authority validation valid (rarity is display-only)", () => {
    expect(validateItemPools()).toEqual({ kind: "valid" });
  });

  it("does not derive rarity from price (rejected price-derived rule)", () => {
    const priceFive = catalog.filter((item) => item.price === 5);
    const allRare = priceFive.every((item) => item.rarity === "rare");
    expect(allRare).toBe(false);
    // And expensive != rare generally: at least one Rare is not the top price.
    expect(catalog.some((item) => item.rarity === "rare" && item.price < 5)).toBe(true);
  });

  it("exposes stable authored sentinel rarities for mixed-card fixtures", () => {
    const byId = (id: string) => catalog.find((item) => item.id === id)!;
    expect(byId("neutral-copper-core-radiator").rarity).toBe("standard");
    expect(byId("neutral-trackside-tachometer").rarity).toBe("rare");
    expect(byId("rook-variable-pitch-propeller").rarity).toBe("rare");
  });

  it("labels every rarity with non-color structural semantics and an accessibility token", () => {
    for (const rarity of RARITIES) {
      const semantics = RARITY_SEMANTICS[rarity];
      expect(semantics.label).toMatch(/^(Standard|Notable|Rare)$/);
      expect(semantics.frame).toBeDefined();
      expect(semantics.a11yToken.length).toBeGreaterThan(0);
    }
    // Rarity identifiers differ wholly — never color-only tokens.
    const tokens = RARITIES.map((r) => `${RARITY_SEMANTICS[r].label}-${RARITY_SEMANTICS[r].frame}-${RARITY_SEMANTICS[r].a11yToken}`);
    expect(new Set(tokens).size).toBe(3);
  });

  it("mixed-card fixture yields one card per rarity", () => {
    const cards = mixedRarityCards().map((item) => item.rarity).sort();
    expect(new Set(cards)).toEqual(new Set(RARITIES));
  });
});
