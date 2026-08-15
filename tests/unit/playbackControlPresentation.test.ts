import { describe, expect, it } from "vitest";
import {
  freshPlaybackControlPlan,
  layoutPlaybackControls,
  playbackControlPlan,
  playbackSpeedFromShortcut,
  selectPlaybackControl,
} from "../../src/scenes/playbackControlPresentation";
import {
  advancePlaybackController,
  createPlaybackController,
  skipPlaybackController,
  type PlaybackSpeed,
} from "../../src/simulation/playback";
import {
  EIGHT_CAR_BOUNDARY_VIEW,
  TWO_CAR_BOUNDARY_VIEW,
} from "../fixtures/playback-control-fixtures";

/**
 * 030-race-playback-controls Phase 5 unit coverage for the pure control
 * presentation model and message lifecycle (T025/T032/T035). The repo ships
 * no headless Phaser harness, so these prove the framework-free presentation
 * layer both scenes render from.
 */

describe("T032: pure control model — exactly two controls, labels, shortcuts, selection", () => {
  it("always returns exactly two controls in stable normal→fast authored order", () => {
    const plan = playbackControlPlan("normal");
    expect(plan.controls).toHaveLength(2);
    expect(plan.controls.map((control) => control.speed)).toEqual(["normal", "fast"]);
    expect(plan.controls.map((control) => control.order)).toEqual([0, 1]);
  });

  it("carries the canonical labels (1×/2×) and shortcuts (1/2)", () => {
    const plan = playbackControlPlan("normal");
    expect(plan.controls.map((control) => control.label)).toEqual(["1×", "2×"]);
    expect(plan.controls.map((control) => control.shortcut)).toEqual(["1", "2"]);
  });

  it("marks exactly one control selected during active playback (single-selection invariant)", () => {
    for (const speed of ["normal", "fast"] as PlaybackSpeed[]) {
      const plan = playbackControlPlan(speed);
      const selected = plan.controls.filter((control) => control.selected);
      expect(selected).toHaveLength(1);
      expect(selected[0].speed).toBe(speed);
      expect(plan.selectedControl?.speed).toBe(speed);
    }
  });

  it("marks NO control selected when playback is inactive (contract §6)", () => {
    const plan = playbackControlPlan("normal", false);
    expect(plan.controls.every((control) => !control.selected)).toBe(true);
    expect(plan.selectedControl).toBeNull();
  });

  it("uses a persistent non-color selected marker so the active control is readable without color", () => {
    const plan = playbackControlPlan("fast");
    const active = plan.controls.find((control) => control.selected)!;
    const inactive = plan.controls.find((control) => !control.selected)!;
    expect(active.selectedMarker).toBe("▶");
    expect(inactive.selectedMarker).toBe("·");
  });

  it("fresh playback selects 2× by default while retaining 1× (contract §6)", () => {
    const plan = freshPlaybackControlPlan();
    expect(plan.selectedControl?.speed).toBe("fast");
    expect(plan.controls.some((control) => control.speed === "normal")).toBe(true);
  });

  it("selection is idempotent and only changes the marker, never the control set", () => {
    let plan = freshPlaybackControlPlan();
    plan = selectPlaybackControl(plan, "fast");
    expect(plan.selectedControl?.speed).toBe("fast");
    const reselected = selectPlaybackControl(plan, "fast");
    expect(reselected.controls.map((control) => control.speed)).toEqual(["normal", "fast"]);
    expect(reselected.selectedControl?.speed).toBe("fast");
  });

  it("resolves keyboard shortcuts 1/2 to normal/fast and rejects others", () => {
    expect(playbackSpeedFromShortcut("1")).toBe("normal");
    expect(playbackSpeedFromShortcut("2")).toBe("fast");
    expect(playbackSpeedFromShortcut("f")).toBeNull();
    expect(playbackSpeedFromShortcut("")).toBeNull();
  });
});

describe("T025: message lifecycle — event-driven replacement, no timer, no queue, no delay", () => {
  it("replaces (not appends) events each frame — no cross-frame message queue", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 0.001); // init batch
    expect(controller.lastEvents.length).toBeGreaterThan(0);
    controller = advancePlaybackController(controller, 0.001); // no new boundary
    expect(controller.lastEvents).toEqual([]);
    controller = advancePlaybackController(controller, 4); // crosses player lap 1 at schedule 2.0
    expect(controller.lastEvents.length).toBeGreaterThan(0);
  });

  it("applies multiple same-frame events in deterministic order with results-ready last", () => {
    const controller = skipPlaybackController(createPlaybackController(TWO_CAR_BOUNDARY_VIEW));
    const kinds = controller.lastEvents.map((event) => event.kind);
    expect(kinds[0]).toBe("time-zero");
    expect(kinds[kinds.length - 1]).toBe("results-ready");
  });

  it("has no dismissal timer — a message holds until replaced", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 0.001);
    controller = advancePlaybackController(controller, 4); // schedule 2.001, crosses player-lap
    expect(controller.lastEvents.some((event) => event.kind === "player-lap")).toBe(true);
    controller = advancePlaybackController(controller, 0); // zero advance clears
    expect(controller.lastEvents).toEqual([]);
  });

  it("never delays Results navigation — results-ready is the final event", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 40); // schedule 20.0 at 1×
    expect(controller.resultsReady).toBe(true);
    expect(controller.lastEvents[controller.lastEvents.length - 1].kind).toBe("results-ready");
  });
});

describe("T035: logical layout — control bounds at 800×450", () => {
  const layout = layoutPlaybackControls();

  it("returns exactly two control regions in stable normal→fast order", () => {
    expect(layout.regions).toHaveLength(2);
    expect(layout.regions.map((region) => region.id)).toEqual(["normal", "fast"]);
  });

  it("never overlaps reserved track, projection, ticker, lap-label, item, or vehicle-stat regions", () => {
    expect(layout.overlapsReserved).toBe(false);
  });

  it("never overflows the 800×450 viewport", () => {
    expect(layout.overflowsViewport).toBe(false);
  });

  it("places both controls in the bottom safe band below the item board", () => {
    for (const region of layout.regions) {
      expect(region.y).toBeGreaterThanOrEqual(438);
      expect(region.y + region.height).toBeLessThanOrEqual(450);
    }
  });
});
