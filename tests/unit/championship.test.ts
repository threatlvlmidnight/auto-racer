import { describe, expect, it } from "vitest";
import { REGION_DEFINITIONS, SELECTABLE_REGION_IDS, regionDefinition } from "../../src/content/regions";
import {
  WORLD_TOUR_STAGE_COUNT,
  buildCommittedWorldTour,
  buildTourLeg,
  confirmDestination,
  createDestinationOffer,
} from "../../src/simulation/championship";
import type { SelectableRegionId } from "../../src/simulation/types";

describe("world championship regions", () => {
  it("publishes six selectable regions and one fixed Paris finale", () => {
    expect(SELECTABLE_REGION_IDS).toHaveLength(6);
    expect(new Set(SELECTABLE_REGION_IDS).size).toBe(6);
    expect(REGION_DEFINITIONS).toHaveLength(7);
    expect(regionDefinition("paris-exhibition")).toMatchObject({ selectable: false });
  });
});

describe("destination offers", () => {
  it("returns the same ordered unvisited pair for the same seed and transition", () => {
    const first = createDestinationOffer(1901, 0, []);
    expect(createDestinationOffer(1901, 0, [])).toEqual(first);
    expect(first.options).toHaveLength(2);
  });

  it("excludes visited regions and commits only a region in the offer", () => {
    const visited: SelectableRegionId[] = ["british-isles", "north-america"];
    const offer = createDestinationOffer(42, 2, visited);
    expect(offer.options.every((region) => !visited.includes(region))).toBe(true);
    expect(confirmDestination(offer, offer.options[0], visited)).toEqual([...visited, offer.options[0]]);
    expect(visited).toEqual(["british-isles", "north-america"]);
    expect(() => confirmDestination(offer, "british-isles", visited)).toThrow(/not part/);
  });
});

describe("five-leg schedule", () => {
  it("builds the exact cadence and lap table for every leg", () => {
    const regions: SelectableRegionId[] = [
      "british-isles", "continental-europe", "north-america", "south-america",
    ];
    const legs = buildCommittedWorldTour("run-029", regions);
    expect(legs).toHaveLength(5);
    expect(legs[4].regionId).toBe("paris-exhibition");
    expect(legs.flatMap((leg) => leg.stages)).toHaveLength(WORLD_TOUR_STAGE_COUNT);
    expect(legs.map((leg) => leg.stages.filter((stage) => stage.kind === "race").map((stage) => stage.lapCount)))
      .toEqual([[8, 10, 8, 10], [8, 10, 10, 12], [10, 12, 10, 12], [10, 14, 12, 14], [12, 14, 12, 16]]);
    for (const leg of legs) {
      expect(leg.stages.map((stage) => stage.kind)).toEqual([
        "arrival", "race", "preparation", "race", "preparation", "race", "preparation", "race",
      ]);
      expect(leg.stages.filter((stage) => stage.kind === "race").map((stage) => stage.raceKind))
        .toEqual(["local", "championship", "local", "championship"]);
    }
    expect(legs.flatMap((leg) => leg.stages).filter((stage) => stage.raceKind === "championship")
      .map((stage) => stage.championshipRaceOrdinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("rejects duplicate routes and Paris outside the finale", () => {
    expect(() => buildCommittedWorldTour("run", ["british-isles", "british-isles", "north-america", "south-america"]))
      .toThrow(/four unique/);
    expect(() => buildTourLeg("run", 4, "paris-exhibition")).toThrow(/reserved/);
    expect(() => buildTourLeg("run", 5, "british-isles")).toThrow(/must be Paris/);
  });
});
