import { describe, expect, it } from "vitest";
import { deriveEligibleSetupControls } from "../../src/simulation/raceSetup";
import { adjustablePresentation, currentSetupValueLabel } from "../../src/scenes/adjustablePresentation";
import {
  adjustableBuild,
  configurableItem,
  nonConfigurableItem,
  storedConfigurableItem,
  representativeSelections,
} from "../fixtures/interface-clarity-fixtures";

describe("Feature 035 adjustable semantics (T009)", () => {
  it("marks an installed configurable item as ADJUSTABLE with a current value", () => {
    const build = adjustableBuild();
    const eligible = deriveEligibleSetupControls(build);
    const model = adjustablePresentation({
      item: configurableItem,
      heldLocation: { area: "vehicle", slotId: "slot-1" },
      eligibleControls: eligible,
      selections: representativeSelections,
    });
    expect(model.status).toBe("available");
    expect(model.badgeLabel).toBe("ADJUSTABLE");
    expect(model.controlFamily).toBe("brake-balance");
    expect(model.currentValueLabel).toBe("Stability");
    expect(model.controlLabel).toBe("Brake Balance");
  });

  it("resolves current value labels from the shared setup selections", () => {
    const build = adjustableBuild();
    const eligible = deriveEligibleSetupControls(build);
    const brake = eligible.find((entry) => entry.family === "brake-balance")!;
    expect(currentSetupValueLabel(brake, representativeSelections)).toBe("Stability");
    expect(currentSetupValueLabel(brake, {})).toBe("Balanced");
  });

  it("marks a stored configurable item as absent (never implies an available control)", () => {
    const build = adjustableBuild();
    const eligible = deriveEligibleSetupControls(build);
    const model = adjustablePresentation({
      item: storedConfigurableItem,
      heldLocation: { area: "storage", index: 0 },
      eligibleControls: eligible,
    });
    expect(model.status).toBe("absent");
    expect(model.badgeLabel).toBeNull();
  });

  it("marks a non-configurable item as absent with no badge", () => {
    const build = adjustableBuild();
    const eligible = deriveEligibleSetupControls(build);
    const model = adjustablePresentation({
      item: nonConfigurableItem,
      heldLocation: { area: "vehicle", slotId: "slot-1" },
      eligibleControls: eligible,
    });
    expect(model.status).toBe("absent");
    expect(model.badgeLabel).toBeNull();
  });

  it("derives availability from real eligible setup controls (installed-only)", () => {
    const build = adjustableBuild();
    const eligible = deriveEligibleSetupControls(build);
    // brake-balance is the installed item's family, so it is the only equipment family.
    expect(eligible.some((entry) => entry.family === "brake-balance")).toBe(true);
    expect(eligible.some((entry) => entry.family === "racing-line")).toBe(false);
  });
});
