import { describe, expect, it } from "vitest";
import { deriveEligibleSetupControls } from "../../src/simulation/raceSetup";
import { resolveDuplicateAcquisition } from "../../src/simulation/tiering";
import { validateItemPools } from "../../src/simulation/itemPools";
import { adjustableBuild, duplicateUpgradePair } from "../fixtures/interface-clarity-fixtures";
import { testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

describe("Feature 035 baseline regressions (T005/T027)", () => {
  it("keeps Feature 028 eligible setup control authority unchanged by display-only rarity", () => {
    const eligible = deriveEligibleSetupControls(adjustableBuild());
    // Installed configurable item still yields its equipment control; storage is ignored.
    expect(eligible.some((entry) => entry.family === "brake-balance")).toBe(true);
    expect(eligible.some((entry) => entry.family === "racing-line")).toBe(false);
    const sourceLabels = eligible.map((entry) => entry.sourceItemIds.join(","));
    expect(sourceLabels).toBeDefined();
  });

  it("keeps Feature 032/016 duplicate-upgrade authority unchanged by rarity", () => {
    const [held] = duplicateUpgradePair;
    // Two installed copies of the same item: the offer still tier-upgrades tier 1 -> tier 2.
    const build = vehicleBuild([held, held]);
    const resolution = resolveDuplicateAcquisition(build, held);
    expect(resolution).toEqual({ kind: "tier-upgrade", area: "vehicle", slotId: build.slots[0].slotId, fromTier: 1, toTier: 2 });
  });

  it("keeps the pool validation valid (rarity adds no authority issue)", () => {
    expect(validateItemPools()).toEqual({ kind: "valid" });
  });

  it("rarity never changes a synthetic item's price or effect truth", () => {
    const base = testItem({ id: "rarity-noop", name: "Rarity Noop", price: 4, timeModifier: -1 });
    const fancy = testItem({ id: "rarity-noop", name: "Rarity Noop", price: 4, timeModifier: -1, rarity: "rare" });
    expect(base.rarity).toBe("standard");
    expect(fancy.rarity).toBe("rare");
    expect(base.price).toBe(fancy.price);
    expect(base.timeModifier).toBe(fancy.timeModifier);
  });
});
