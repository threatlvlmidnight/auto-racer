import { describe, expect, it } from "vitest";
import { classifyScalingItem } from "../../src/simulation/buffs";
import {
  amplifierFixture,
  compositionScaledFixture,
  configurableFixture,
  cooldownLapFixture,
  countSynergyBuffFixture,
  directFixture,
  economyFixtures,
  exactCountSynergyFixture,
  fittedValueScaledFixture,
} from "../fixtures/demo-feedback-fixtures";
import { testItem } from "../fixtures/vehicle-build-fixtures";
import type { ScalingClassification } from "../../src/simulation/types";

/**
 * Feature 032 T014: catalog-wide scaling classification tests (FR-005,
 * research Decision 2). "Scaling" is an audited vocabulary: every shipped
 * scaling-like rule classifies as composition, fitted-value, or
 * lap-activation — and nothing else ever does.
 */

const NONE_HELD = { heldItems: [], installedItems: [] };

describe("classifyScalingItem categories", () => {
  it("classifies composition synergy scaling (Variable-Pitch Propeller) with live count input", () => {
    const otherAirflow = testItem({ id: "airflow-2", name: "Airflow 2", price: 2, timeModifier: 0, synergyTags: ["airflow"] });
    const classification = classifyScalingItem(compositionScaledFixture, {
      heldItems: [compositionScaledFixture, otherAirflow],
      installedItems: [compositionScaledFixture, otherAirflow],
    })!;

    expect(classification.kind).toBe("composition");
    expect(classification.sourceItemId).toBe(compositionScaledFixture.id);
    expect(classification.targetStat).toBe("topSpeed");
    expect(classification.currentInput).toBe(1);
    expect(classification.currentMagnitude).toBe(15);
    expect(classification.nextTriggerLabel.length).toBeGreaterThan(0);
  });

  it("classifies count-synergy buffs (perCount) as composition scaling", () => {
    const matching = testItem({
      id: "pressure-item", name: "Pressure Item", price: 2, timeModifier: 0,
      physics: { accelerationDelta: 6 },
    });
    const classification = classifyScalingItem(countSynergyBuffFixture, {
      heldItems: [countSynergyBuffFixture, matching],
      installedItems: [countSynergyBuffFixture],
    })!;

    expect(classification.kind).toBe("composition");
    expect(classification.targetStat).toBe("acceleration");
    expect(classification.currentInput).toBe(1);
    expect(classification.currentMagnitude).toBe(countSynergyBuffFixture.buff!.boostPercent);
  });

  it("classifies fitted-build-value scaling with the summed installed value as input", () => {
    const fitted = testItem({ id: "fitted-1", name: "Fitted", price: 4, timeModifier: 0 });
    const storedDecoy = testItem({ id: "stored-1", name: "Stored", price: 100, timeModifier: 0 });
    const classification = classifyScalingItem(fittedValueScaledFixture, {
      heldItems: [fittedValueScaledFixture, fitted, storedDecoy],
      installedItems: [fittedValueScaledFixture, fitted],
    })!;

    expect(classification.kind).toBe("fitted-value");
    // Input is the summed price of installed items only — storage never counts.
    expect(classification.currentInput).toBe(fittedValueScaledFixture.price + fitted.price);
    expect(classification.currentMagnitude)
      .toBe(fittedValueScaledFixture.buff!.boostPercent * classification.currentInput);
  });

  it("classifies cooldown stacking buffs as lap-activation with retained evidence", () => {
    const withoutEvidence = classifyScalingItem(cooldownLapFixture, NONE_HELD)!;
    expect(withoutEvidence.kind).toBe("lap-activation");
    expect(withoutEvidence.currentInput).toBe(0);
    expect(withoutEvidence.currentMagnitude).toBe(0);

    const withEvidence = classifyScalingItem(cooldownLapFixture, {
      ...NONE_HELD,
      lapActivations: { activations: 2, currentPercent: 6 },
    })!;
    expect(withEvidence.currentInput).toBe(2);
    expect(withEvidence.currentMagnitude).toBe(6);
  });

  it("classifies exact-count synergy thresholds as composition scaling", () => {
    const classification = classifyScalingItem(exactCountSynergyFixture, {
      heldItems: [exactCountSynergyFixture],
      installedItems: [exactCountSynergyFixture],
    })!;

    expect(classification.kind).toBe("composition");
    expect(classification.targetStat).toBe("corneringSpeed");
    expect(classification.currentInput).toBe(0);
    expect(classification.currentMagnitude).toBe(0);
  });
});

describe("classifyScalingItem exclusions (FR-005: no invented progression)", () => {
  it("returns null for non-scaling items: direct, flat amplifier, economy, configurable", () => {
    [
      directFixture,
      amplifierFixture,
      economyFixtures.bookmakersChit,
      economyFixtures.engineBuildersNameplate,
      economyFixtures.patronsBrassPlaque,
      configurableFixture,
    ].forEach((item) => {
      expect(classifyScalingItem(item, NONE_HELD), item.id).toBeNull();
    });
  });

  it("never implies race/day persistence: labels name inputs, not time", () => {
    const classifications = [
      classifyScalingItem(compositionScaledFixture, NONE_HELD)!,
      classifyScalingItem(fittedValueScaledFixture, NONE_HELD)!,
      classifyScalingItem(cooldownLapFixture, NONE_HELD)!,
    ];
    classifications.forEach((classification: ScalingClassification) => {
      expect(classification.nextTriggerLabel.toLowerCase()).not.toMatch(/day|race progress|over time|permanently/);
    });
  });

  it("is pure: identical inputs always classify identically", () => {
    const context = { heldItems: [compositionScaledFixture], installedItems: [compositionScaledFixture] };
    expect(classifyScalingItem(compositionScaledFixture, context))
      .toEqual(classifyScalingItem(compositionScaledFixture, context));
  });
});
