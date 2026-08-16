import { describe, expect, it } from "vitest";
import { cardFeedbackState, resolveCardLayout } from "../../src/scenes/cardFeedbackPresentation";
import {
  mixedRarityCards,
  duplicateUpgradePair,
  REDUCED_MOTION,
} from "../fixtures/interface-clarity-fixtures";

describe("Feature 035 card feedback state (T010)", () => {
  it("exposes rarity with non-color structure, not color labels", () => {
    const [standard, notable, rare] = mixedRarityCards().map((item) =>
      cardFeedbackState({ item, role: "offer", availability: "available" }),
    );
    expect(standard.rarityLabel).toBe("Standard");
    expect(notable.rarityLabel).toBe("Notable");
    expect(rare.rarityLabel).toBe("Rare");
    // Rarity facts are carried as text/token/frame — the frame differs for Rare.
    expect(rare.rarityFrame).toBe("ornate");
    expect(standard.rarityFrame).toBe("flat");
    // Accessibility tokens are all present and non-empty.
    for (const card of [standard, notable, rare]) expect(card.a11yToken).toBeTruthy();
  });

  it("applies structural precedence (unavailable before rarity, etc.)", () => {
    const item = mixedRarityCards()[0];
    const unavailable = cardFeedbackState({ item, role: "offer", availability: "unavailable" });
    const normal = cardFeedbackState({ item, role: "offer", availability: "available", selected: true });
    expect(unavailable.availability).toBe("unavailable");
    expect(unavailable.framePriority[0]).toBe("unavailable");
    // normal: rarity is the first structural cue, then selection.
    expect(normal.framePriority).toContain("rarity");
    expect(normal.framePriority.indexOf("rarity")).toBeLessThan(normal.framePriority.indexOf("selection"));
  });

  it("exposes upgrade eligibility before purchase without suppressing facts", () => {
    const [held] = duplicateUpgradePair;
    const offered = cardFeedbackState({
      item: held,
      role: "offer",
      upgradeEligible: true,
      upgradeReason: "A held duplicate can upgrade this item to Tier 2.",
    });
    expect(offered.upgradeEligible).toBe(true);
    expect(offered.upgradeReason).toContain("upgrade");
    // Even when eligible, price/tier/rule facts are not suppressed — all still present.
    expect(offered.availability).toBe("available");
    expect(offered.rarity).toBeTruthy();
  });

  it("keeps the same meaning under reduced motion with no essential animation", () => {
    const item = mixedRarityCards()[2];
    const motion = cardFeedbackState({ item, role: "offer" });
    const reduced = cardFeedbackState({ item, role: "offer", reducedMotion: REDUCED_MOTION });
    expect(reduced.motionMode).toBe("reduced");
    expect(motion.motionMode).toBe("motion");
    // All consequential facts survive reduction.
    expect(reduced.rarityLabel).toBe(motion.rarityLabel);
    expect(reduced.upgradeEligible).toBe(motion.upgradeEligible);
    expect(reduced.a11yToken).toBe(motion.a11yToken);
  });

  it("does not imply upgrade eligibility when none exists", () => {
    const [held] = duplicateUpgradePair;
    const card = cardFeedbackState({ item: held, role: "held" });
    expect(card.upgradeEligible).toBe(false);
    expect(card.upgradeReason).toBeNull();
  });
});

describe("Feature 035 compact/pinned layout decisions (T033/T035)", () => {
  it("resolves a full layout for a short, sparse card", () => {
    const layout = resolveCardLayout({ width: 240, height: 120, nameLength: 12, effectCount: 1, metadataDensity: 1 });
    expect(layout.treatment).toBe("full");
    expect(layout.truncateToDetail).toBe(false);
    expect(layout.metadataLines).toBe(2);
  });

  it("pins dense/long-copy cards instead of shrinking and clipping", () => {
    const layout = resolveCardLayout({ width: 240, height: 120, nameLength: 34, effectCount: 6, metadataDensity: 1 });
    expect(layout.treatment).toBe("pinned");
    expect(layout.truncateToDetail).toBe(true);
    expect(layout.effectLinesVisible).toBeLessThan(6);
    // Metadata is never forced onto a single clipped line.
    expect(layout.metadataLines).toBe(2);
  });

  it("chooses a compact treatment on narrow boxes with a detail hint", () => {
    const layout = resolveCardLayout({ width: 96, height: 80, nameLength: 10, effectCount: 3, metadataDensity: 1 });
    expect(layout.treatment).toBe("compact");
    expect(layout.effectLinesVisible).toBe(1);
    expect(layout.truncateToDetail).toBe(true);
  });
});
