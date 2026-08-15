import { describe, expect, it } from "vitest";
import {
  advancePlaybackController,
  createPlaybackController,
  selectPlaybackControllerSpeed,
} from "../../src/simulation/playback";
import { EIGHT_CAR_BOUNDARY_VIEW } from "../fixtures/playback-control-fixtures";
import type { LiveStatChange } from "../../src/simulation/types";

describe("watched-race retained feedback boundaries", () => {
  it("publishes retained stat changes at their authored lap boundary", () => {
    const change: LiveStatChange = { boundaryId: "lap-1-speed", lap: 1, stat: "topSpeed", previousValue: 10,
      currentValue: 11, delta: 1, direction: "up", sourceItemId: "item", sourceItemName: "Item", amplifierSources: [] };
    const view = { ...EIGHT_CAR_BOUNDARY_VIEW, playerStatChanges: [[change]] };
    const controller = advancePlaybackController(createPlaybackController(view), 0.01);
    const event = controller.lastEvents.find((candidate) => candidate.kind === "live-stat-change");
    expect(event?.statChanges).toEqual([change]);
  });
  it("consumes every boundary once when a delayed frame crosses several events", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 8);
    const firstIds = controller.lastEvents.map((event) => `${event.kind}:${event.boundaryKey}:${event.lap ?? ""}`);
    controller = advancePlaybackController(controller, 0);
    expect(controller.lastEvents).toEqual([]);
    controller = advancePlaybackController(controller, 8);
    const allIds = [...firstIds, ...controller.lastEvents.map((event) => `${event.kind}:${event.boundaryKey}:${event.lap ?? ""}`)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("keeps the crossed boundary set identical at 1× and 2×", () => {
    const collect = (speed: "normal" | "fast") => {
      let controller = selectPlaybackControllerSpeed(createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW), speed);
      const events: string[] = [];
      for (let i = 0; i < 1500 && !controller.resultsReady; i += 1) {
        controller = advancePlaybackController(controller, 1 / 30);
        events.push(...controller.lastEvents.map((event) => `${event.kind}:${event.boundaryKey}:${event.lap ?? ""}`));
      }
      return events;
    };
    expect(collect("normal")).toEqual(collect("fast"));
  });
});
