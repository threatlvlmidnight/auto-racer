import { describe, expect, it } from "vitest";
import { synergyRelationshipProjection } from "../../src/scenes/itemPresentation";
import { testItem } from "../fixtures/vehicle-build-fixtures";

describe("synergy presentation contract", () => {
  it("reports target, threshold, current result, and state", () => {
    const source = testItem({ id: "source", name: "Source", installationCategory: "chassis", synergyEffects: [{
      target: { kind: "category", category: "power" }, appliesTo: "self",
      condition: { kind: "exact-other-count", count: 2, bonusPercent: 50 }, targetStat: "corneringSpeed", description: "two power items",
    }], price: 1, timeModifier: 0 });
    const powerA = testItem({ id: "power-a", name: "Power A", price: 1, timeModifier: 0, installationCategory: "power" });
    const powerB = testItem({ id: "power-b", name: "Power B", price: 1, timeModifier: 0, installationCategory: "power" });
    const [evidence] = synergyRelationshipProjection(source, [source, powerA, powerB]);
    expect(evidence).toMatchObject({ targetLabel: "power items", targetStatLabel: "Cornering Speed", authoredMagnitudeLabel: "+50% at exactly 2", currentMagnitudeLabel: "+50%", matchCount: 2, state: "satisfied" });
  });
});
