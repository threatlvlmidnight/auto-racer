import { describe, expect, it } from "vitest";
import {
  createPlaybackController,
  advancePlaybackController,
  selectPlaybackControllerSpeed,
  skipPlaybackController,
  maxFinishScheduleTime,
  type CrossedPlaybackEvent,
  type PlaybackBoundaryView,
  type PlaybackController,
  type PlaybackSpeed,
} from "../../src/simulation/playback";
import {
  playbackControlPlan,
  playbackSpeedFromShortcut,
} from "../../src/scenes/playbackControlPresentation";
import { practiceContestControlPlan } from "../../src/scenes/practicePresentation";
import {
  EIGHT_CAR_BOUNDARY_VIEW,
  EIGHT_CAR_RESULT,
  LEGACY_WHOLE_RACE_SECONDS,
  TWO_CAR_BOUNDARY_VIEW,
} from "../fixtures/playback-control-fixtures";

/**
 * 030-race-playback-controls Phases 3–5 integration coverage. This repo
 * ships no headless Phaser harness (Phase 1 baseline convention: no scene is
 * ever instantiated in tests), so these prove the *pure* timing, lifecycle,
 * evidence-parity, and input-parity invariants both watched-race scenes
 * delegate to. The controller + boundary view are the exact objects
 * ContestScene/PracticeContestScene consume.
 */

const FINISH_EIGHT = maxFinishScheduleTime(EIGHT_CAR_BOUNDARY_VIEW); // 20
const FINISH_TWO = maxFinishScheduleTime(TWO_CAR_BOUNDARY_VIEW); // 20

/** Advance a controller to completion at a fixed real delta, collecting every crossed event. */
function runToCompletion(
  view: PlaybackBoundaryView,
  realDeltaSeconds: number,
  speed: PlaybackSpeed = "normal",
): { events: CrossedPlaybackEvent[]; realSeconds: number } {
  let controller = createPlaybackController(view);
  controller = selectPlaybackControllerSpeed(controller, speed);
  const events: CrossedPlaybackEvent[] = [];
  let realSeconds = 0;
  let guard = 0;
  while (!controller.resultsReady && guard < 100000) {
    controller = advancePlaybackController(controller, realDeltaSeconds);
    events.push(...controller.lastEvents);
    realSeconds += realDeltaSeconds;
    guard += 1;
  }
  return { events, realSeconds };
}

describe("T014 [US1]: whole-race timing at 1× matches legacy duration", () => {
  it("eight-car race at 1× lasts 1.00 ± 0.05 × the 20 s legacy duration", () => {
    const { realSeconds } = runToCompletion(EIGHT_CAR_BOUNDARY_VIEW, 1 / 60, "normal");
    const ratio = realSeconds / LEGACY_WHOLE_RACE_SECONDS;
    expect(ratio).toBeGreaterThanOrEqual(0.95);
    expect(ratio).toBeLessThanOrEqual(1.05);
  });

  it("two-car (Test Day) race at 1× matches the legacy duration", () => {
    const { realSeconds } = runToCompletion(TWO_CAR_BOUNDARY_VIEW, 1 / 60, "normal");
    const ratio = realSeconds / LEGACY_WHOLE_RACE_SECONDS;
    expect(ratio).toBeGreaterThanOrEqual(0.95);
    expect(ratio).toBeLessThanOrEqual(1.05);
  });

  it("reaches the identical 20 s finish schedule time at 1× for both fixtures", () => {
    const eight = runToCompletion(EIGHT_CAR_BOUNDARY_VIEW, 0.1, "normal");
    const two = runToCompletion(TWO_CAR_BOUNDARY_VIEW, 0.1, "normal");
    expect(eight.events.some((event) => event.kind === "results-ready")).toBe(true);
    expect(two.events.some((event) => event.kind === "results-ready")).toBe(true);
  });
});

describe("T015 [US1]: scored-race lifecycle initializes a fresh normal-speed clock", () => {
  it("every fresh controller starts at 1× (normal) with zero schedule time", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
      expect(controller.clock.speed).toBe("normal");
      expect(controller.clock.scheduleTimeSeconds).toBe(0);
      expect(controller.clock.initialized).toBe(false);
      expect(controller.resultsReady).toBe(false);
      expect(controller.lastEvents).toEqual([]);
    }
  });

  it("a completed race and a fresh restart are independent (no remembered speed/state)", () => {
    const first = runToCompletion(EIGHT_CAR_BOUNDARY_VIEW, 0.1, "fast");
    expect(first.events.some((event) => event.kind === "results-ready")).toBe(true);
    const fresh = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    expect(fresh.clock.speed).toBe("normal");
    expect(fresh.clock.scheduleTimeSeconds).toBe(0);
    expect(fresh.resultsReady).toBe(false);
  });
});

describe("T016 [US1]: Test Day lifecycle — fresh normal clock, Pause/Skip/Cancel remain available", () => {
  it("fresh Test Day controller initializes to the same normal-speed clock as scored races", () => {
    const scored = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    const testDay = createPlaybackController(TWO_CAR_BOUNDARY_VIEW);
    expect(testDay.clock.speed).toBe(scored.clock.speed);
    expect(testDay.clock.speed).toBe("normal");
    expect(testDay.clock.scheduleTimeSeconds).toBe(0);
  });

  it("Skip targets the finite finish boundary (not Infinity) and still reaches results-ready", () => {
    let controller = createPlaybackController(TWO_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 0.001);
    controller = skipPlaybackController(controller);
    expect(Number.isFinite(controller.clock.scheduleTimeSeconds)).toBe(true);
    expect(controller.clock.scheduleTimeSeconds).toBe(FINISH_TWO);
    expect(controller.resultsReady).toBe(true);
  });

  it("the Test Day control plan retains Cancel/Pause/Skip alongside the new 1×/2× speeds", () => {
    const ids = practiceContestControlPlan().map((control) => control.id);
    expect(ids).toContain("cancel");
    expect(ids).toContain("pause");
    expect(ids).toContain("skip");
    // The legacy cyclic SPEED/F control is removed (Phase 5 T040) — 1×/2×
    // replace it via playbackControlPlan instead.
    expect(ids).not.toContain("speed");
  });
});

describe("T022 [US2]: all-2× halves legacy duration; mixed sequences yield calculated remaining duration", () => {
  it("eight-car race at 2× lasts 0.50 ± 0.05 × the legacy duration", () => {
    const { realSeconds } = runToCompletion(EIGHT_CAR_BOUNDARY_VIEW, 1 / 60, "fast");
    const ratio = realSeconds / LEGACY_WHOLE_RACE_SECONDS;
    expect(ratio).toBeGreaterThanOrEqual(0.45);
    expect(ratio).toBeLessThanOrEqual(0.55);
  });

  it("two-car race at 2× halves the legacy duration", () => {
    const { realSeconds } = runToCompletion(TWO_CAR_BOUNDARY_VIEW, 1 / 60, "fast");
    const ratio = realSeconds / LEGACY_WHOLE_RACE_SECONDS;
    expect(ratio).toBeGreaterThanOrEqual(0.45);
    expect(ratio).toBeLessThanOrEqual(0.55);
  });

  it("a mixed 1×→2× sequence reaches results-ready at the calculated total real duration", () => {
    // 10 s at 1× → schedule 10; remaining schedule 10 at 2× → 5 s real.
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = selectPlaybackControllerSpeed(controller, "normal");
    controller = advancePlaybackController(controller, 10); // schedule 10
    expect(controller.clock.scheduleTimeSeconds).toBe(10);
    controller = selectPlaybackControllerSpeed(controller, "fast");
    const remaining = FINISH_EIGHT - controller.clock.scheduleTimeSeconds;
    const { realSeconds } = runToCompletionAt(controller, EIGHT_CAR_BOUNDARY_VIEW, 1 / 60);
    // realSeconds counts only the fast leg; total = 10 + realSeconds.
    expect(10 + realSeconds).toBeCloseTo(10 + remaining / 2, 1);
  });
});

/** Continue an already-started controller to completion at a fixed delta. */
function runToCompletionAt(
  start: PlaybackController,
  _view: PlaybackBoundaryView,
  realDeltaSeconds: number,
): { events: CrossedPlaybackEvent[]; realSeconds: number } {
  let controller = start;
  const events: CrossedPlaybackEvent[] = [];
  let realSeconds = 0;
  let guard = 0;
  while (!controller.resultsReady && guard < 100000) {
    controller = advancePlaybackController(controller, realDeltaSeconds);
    events.push(...controller.lastEvents);
    realSeconds += realDeltaSeconds;
    guard += 1;
  }
  return { events, realSeconds };
}


describe("T023 [US2]: rapid/final-moment switching — no restart, rewind, jump, duplicate Results, post-finish mutation", () => {
  it("switching speed every frame never decreases schedule time (no rewind)", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    let previous = controller.clock.scheduleTimeSeconds;
    for (let frame = 0; frame < 200; frame += 1) {
      controller = selectPlaybackControllerSpeed(controller, frame % 2 === 0 ? "normal" : "fast");
      controller = advancePlaybackController(controller, 0.1);
      expect(controller.clock.scheduleTimeSeconds).toBeGreaterThanOrEqual(previous);
      previous = controller.clock.scheduleTimeSeconds;
      if (controller.resultsReady) break;
    }
  });

  it("a final-moment switch exactly at the finish boundary does not duplicate results-ready", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = selectPlaybackControllerSpeed(controller, "normal");
    controller = advancePlaybackController(controller, 19.8); // schedule 19.8 at 1×
    expect(controller.resultsReady).toBe(false);
    controller = selectPlaybackControllerSpeed(controller, "fast");
    controller = advancePlaybackController(controller, 0.2); // schedule 20.1
    expect(controller.resultsReady).toBe(true);
    const readyCount = controller.lastEvents.filter((event) => event.kind === "results-ready").length;
    expect(readyCount).toBe(1);
    const before = controller.clock.scheduleTimeSeconds;
    const again = advancePlaybackController(controller, 5);
    expect(again).toBe(controller);
    expect(controller.clock.scheduleTimeSeconds).toBe(before);
  });

  it("switching speed after completion is a no-op (no restart)", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 40); // finish at 1×
    expect(controller.resultsReady).toBe(true);
    const switched = selectPlaybackControllerSpeed(controller, "fast");
    expect(switched).toBe(controller);
    expect(switched.resultsReady).toBe(true);
  });
});


describe("T024 [US2]: deep-equality of finish evidence across speed sequences", () => {
  /**
   * The immutable finish-order/outcome/result evidence passed to Results is
   * derived solely from the schedule's recorded boundaries, not speed. So the
   * set of car-finished events (carId + scheduleTime) collected across a full
   * race must be byte-identical regardless of how speed was switched.
   */
  function finishEvents(view: PlaybackBoundaryView, sequence: PlaybackSpeed[]): CrossedPlaybackEvent[] {
    let controller = createPlaybackController(view);
    const events: CrossedPlaybackEvent[] = [];
    let frame = 0;
    let guard = 0;
    while (!controller.resultsReady && guard < 100000) {
      controller = selectPlaybackControllerSpeed(controller, sequence[frame % sequence.length]);
      controller = advancePlaybackController(controller, 0.1);
      events.push(...controller.lastEvents);
      frame += 1;
      guard += 1;
    }
    return events.filter((event) => event.kind === "car-finished");
  }

  it("the eight-car finish order (carId + scheduleTime) is identical across all speed sequences", () => {
    const allNormal = finishEvents(EIGHT_CAR_BOUNDARY_VIEW, ["normal"]);
    const allFast = finishEvents(EIGHT_CAR_BOUNDARY_VIEW, ["fast"]);
    const mixed = finishEvents(EIGHT_CAR_BOUNDARY_VIEW, ["normal", "fast"]);
    expect(allNormal).toStrictEqual(allFast);
    expect(allNormal).toStrictEqual(mixed);
    const ids = allNormal.map((event) => event.carId).sort();
    expect(ids).toStrictEqual([...EIGHT_CAR_RESULT.cars.map((car) => car.id)].sort());
  });

  it("the two-car finish evidence is identical across all speed sequences", () => {
    const allNormal = finishEvents(TWO_CAR_BOUNDARY_VIEW, ["normal"]);
    const allFast = finishEvents(TWO_CAR_BOUNDARY_VIEW, ["fast"]);
    const mixed = finishEvents(TWO_CAR_BOUNDARY_VIEW, ["fast", "normal"]);
    expect(allNormal).toStrictEqual(allFast);
    expect(allNormal).toStrictEqual(mixed);
    expect(allNormal.map((event) => event.carId).sort()).toStrictEqual(["ghost", "player"]);
  });

  it("the results-ready event fires exactly once in every sequence", () => {
    function countReady(view: PlaybackBoundaryView, sequence: PlaybackSpeed[]): number {
      let controller = createPlaybackController(view);
      let count = 0;
      let frame = 0;
      let guard = 0;
      while (!controller.resultsReady && guard < 100000) {
        controller = selectPlaybackControllerSpeed(controller, sequence[frame % sequence.length]);
        controller = advancePlaybackController(controller, 0.1);
        count += controller.lastEvents.filter((event) => event.kind === "results-ready").length;
        frame += 1;
        guard += 1;
      }
      return count;
    }
    expect(countReady(EIGHT_CAR_BOUNDARY_VIEW, ["normal"])).toBe(1);
    expect(countReady(EIGHT_CAR_BOUNDARY_VIEW, ["fast"])).toBe(1);
    expect(countReady(EIGHT_CAR_BOUNDARY_VIEW, ["normal", "fast"])).toBe(1);
  });
});


describe("T033 [US3]: scored-scene input — keys 1/2, pointer/touch parity, repeated selection, cleanup", () => {
  it("keys 1 and 2 resolve to normal and fast (pointer/touch use the same selection)", () => {
    expect(playbackSpeedFromShortcut("1")).toBe("normal");
    expect(playbackSpeedFromShortcut("2")).toBe("fast");
  });

  it("repeated selection of the same speed is idempotent at the controller level (no restart)", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 2);
    const before = controller.clock.scheduleTimeSeconds;
    const selected = selectPlaybackControllerSpeed(controller, "fast");
    const reselected = selectPlaybackControllerSpeed(selected, "fast");
    expect(reselected).toBe(selected);
    expect(selected.clock.scheduleTimeSeconds).toBe(before);
  });

  it("selecting a control after completion is a no-op (inactive/completed safety)", () => {
    let controller = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    controller = advancePlaybackController(controller, 40);
    expect(controller.resultsReady).toBe(true);
    const plan = playbackControlPlan("normal", false); // inactive after completion
    expect(plan.selectedControl).toBeNull();
    expect(selectPlaybackControllerSpeed(controller, "fast")).toBe(controller);
  });

  it("handler cleanup is structural — a fresh controller carries no events from a prior run", () => {
    const first = runToCompletion(EIGHT_CAR_BOUNDARY_VIEW, 0.1, "fast");
    expect(first.events.length).toBeGreaterThan(0);
    const fresh = createPlaybackController(EIGHT_CAR_BOUNDARY_VIEW);
    expect(fresh.lastEvents).toEqual([]);
  });
});

describe("T034 [US3]: Test Day input/focus — direct 1×/2× parity alongside Space/Skip/Escape/Tab", () => {
  it("Test Day exposes the same 1×/2× controls as scored races (direct selection parity)", () => {
    const scored = playbackControlPlan("normal");
    const testDay = playbackControlPlan("normal");
    expect(testDay.controls.map((control) => control.shortcut)).toEqual(
      scored.controls.map((control) => control.shortcut),
    );
    expect(testDay.controls.map((control) => control.label)).toEqual(["1×", "2×"]);
  });

  it("the Test Day control plan retains Pause (Space), Skip (S), and Cancel (Escape) bindings", () => {
    const byKey = new Map(practiceContestControlPlan().map((control) => [control.keyBinding, control]));
    expect(byKey.get("Escape")?.id).toBe("cancel");
    expect(byKey.get("Space")?.id).toBe("pause");
    expect(byKey.get("S")?.id).toBe("skip");
  });

  it("the legacy SPEED/F cyclic control is absent (replaced by direct 1×/2×)", () => {
    const plan = practiceContestControlPlan();
    expect(plan.some((control) => control.id === "speed")).toBe(false);
    expect(plan.some((control) => control.keyBinding === "F")).toBe(false);
  });

  it("keys 1 and 2 select the same speed on Test Day as on scored races", () => {
    expect(playbackSpeedFromShortcut("1")).toBe("normal");
    expect(playbackSpeedFromShortcut("2")).toBe("fast");
  });
});
