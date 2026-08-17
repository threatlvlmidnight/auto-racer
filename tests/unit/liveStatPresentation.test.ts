import { describe, expect, it } from "vitest";
import { reduceLiveStatPanel, type LiveStatPanelState } from "../../src/scenes/vehicleStatPresentation";
import type { LiveStatChange } from "../../src/simulation/types";

const empty: LiveStatPanelState = { lines: [], consumedBoundaryIds: [] };
const change: LiveStatChange = {
  boundaryId: "lap-1-top-speed", lap: 1, stat: "topSpeed",
  previousValue: 12, currentValue: 14.3, delta: 2.3, direction: "up",
  sourceItemId: "pistons", sourceItemName: "Forged Pistons",
  amplifierSources: [{ sourceItemId: "jacket", sourceItemName: "Cooling Jacket", magnitudePercent: 15, affectedContributionLabel: "Forged Pistons topSpeed effect" }],
};

describe("live stat presentation reducer (032 T016)", () => {
  it("shows current value, signed delta, non-color arrow, source, and amplifier", () => {
    const next = reduceLiveStatPanel(empty, [change]);
    expect(next.lines[0]).toMatchObject({ stat: "topSpeed", valueLabel: "110 pt", deltaLabel: "+17.7 pt", marker: "↑", sourceLabel: "Forged Pistons", amplifierLabel: "Cooling Jacket +15%", changed: true });
  });

  it("consumes a boundary exactly once and clears transient changed state when unchanged", () => {
    const first = reduceLiveStatPanel(empty, [change]);
    const second = reduceLiveStatPanel(first, [change]);
    expect(second.lines[0].changed).toBe(false);
    expect(second.lines[0].value).toBeCloseTo(14.3 / 0.13);
    expect(second.consumedBoundaryIds).toEqual([change.boundaryId]);
  });

  it("orders stats canonically regardless of boundary arrival order", () => {
    const acceleration = { ...change, boundaryId: "accel", stat: "acceleration" as const };
    const next = reduceLiveStatPanel(empty, [change, acceleration]);
    expect(next.lines.map((line) => line.stat)).toEqual(["acceleration", "topSpeed"]);
  });
});
