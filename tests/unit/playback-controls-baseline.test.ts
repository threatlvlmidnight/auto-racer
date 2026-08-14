import { describe, expect, it } from "vitest";
import {
  buildNCarPlaybackSchedule,
  maxFinishScheduleTime,
  RACE_ANIMATION_SECONDS,
} from "../../src/simulation/playback";
import {
  CONTROL_FIXTURE_LAP_COUNT,
  CONTROL_FIXTURE_SCALE_FACTOR,
  CONTROL_FIXTURE_TRACK,
  EIGHT_CAR_BOUNDARY_VIEW,
  EIGHT_CAR_RESULT,
  EIGHT_CAR_SCHEDULE,
  LEGACY_WHOLE_RACE_SECONDS,
} from "../fixtures/playback-control-fixtures";

/**
 * 030-race-playback-controls Phase 1 (T003): pre-feature scored-race duration
 * and schedule-boundary baselines. Every value pinned here MUST remain
 * byte-identical through Phase 3 (wiring `PresentationClock` at the `1×`
 * default) and Phase 4 (idempotent `1×`/`2×` selection) — the schedule is
 * immutable evidence that speed only scales how fast presentation consumes it,
 * never the boundaries themselves (contract §1, data-model.md).
 *
 * Values captured directly from `buildNCarPlaybackSchedule` before any
 * feature-030 scene integration: `scaleFactor = RACE_ANIMATION_SECONDS /
 * maxTime = 20 / 40 = 0.5`, so the slowest car (the player, `4 s/lap × 10 =
 * 40 s`) finishes at exactly `20 s` — the legacy whole-race duration
 * `ContestScene` consumes at `1.0×` today (`elapsedSeconds += delta / 1000`,
 * no multiplier, no pause/skip/speed control; FR-009).
 */
describe("baseline: scored eight-car schedule before feature 030 (T003)", () => {
  it("derives the 0.5 scale factor from the slowest car's 40 s total", () => {
    expect(EIGHT_CAR_SCHEDULE.scaleFactor).toBe(CONTROL_FIXTURE_SCALE_FACTOR);
    expect(EIGHT_CAR_SCHEDULE.scaleFactor).toBe(RACE_ANIMATION_SECONDS / 40);
  });

  it("pins the player's exact visual lap boundaries [2, 4, ..., 20]", () => {
    const player = EIGHT_CAR_SCHEDULE.cars.find((car) => car.role === "player")!;
    // 0.5 × 4 s = 2 s per lap, each >= MIN_VISUAL_LAP_SECONDS (0.5).
    expect(player.schedule.visualLapBoundaries).toEqual([
      2, 4, 6, 8, 10, 12, 14, 16, 18, 20,
    ]);
    expect(player.schedule.lapTimes).toEqual(Array(CONTROL_FIXTURE_LAP_COUNT).fill(4));
  });

  it("pins the fastest and slowest rivals' full boundary arrays (formula coverage)", () => {
    const byId = new Map(EIGHT_CAR_SCHEDULE.cars.map((car) => [car.id, car]));
    // rival-1: 0.5 × 2 s = 1 s per lap.
    expect(byId.get("rival-1")!.schedule.visualLapBoundaries).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    // rival-7: 0.5 × 3.5 s = 1.75 s per lap (dyadic → exact accumulation).
    expect(byId.get("rival-7")!.schedule.visualLapBoundaries).toEqual([
      1.75, 3.5, 5.25, 7, 8.75, 10.5, 12.25, 14, 15.75, 17.5,
    ]);
  });

  it("pins each car's finish schedule time (car.time × 0.5), ascending", () => {
    const finishById = new Map(
      EIGHT_CAR_SCHEDULE.cars.map((car) => {
        const last = car.schedule.visualLapBoundaries[car.schedule.visualLapBoundaries.length - 1];
        return [car.id, last] as const;
      }),
    );
    // car.time × scaleFactor: 20→10, 22.5→11.25, 25→12.5, 27.5→13.75, 30→15, 32.5→16.25, 35→17.5, 40→20.
    // Quarter-step lap times make every boundary a dyadic rational, so accumulation
    // is exact and toBe pins the value without floating-point tolerance.
    expect(finishById.get("rival-1")).toBe(10);
    expect(finishById.get("rival-2")).toBe(11.25);
    expect(finishById.get("rival-3")).toBe(12.5);
    expect(finishById.get("rival-4")).toBe(13.75);
    expect(finishById.get("rival-5")).toBe(15);
    expect(finishById.get("rival-6")).toBe(16.25);
    expect(finishById.get("rival-7")).toBe(17.5);
    expect(finishById.get("player")).toBe(20);
  });

  it("pins the legacy 20-second whole-race duration (maxFinishScheduleTime)", () => {
    expect(maxFinishScheduleTime(EIGHT_CAR_BOUNDARY_VIEW)).toBe(LEGACY_WHOLE_RACE_SECONDS);
    expect(maxFinishScheduleTime(EIGHT_CAR_BOUNDARY_VIEW)).toBe(20);
  });

  it("keeps the schedule byte-identical across repeated builds (determinism)", () => {
    const rebuilt = buildNCarPlaybackSchedule(EIGHT_CAR_RESULT, CONTROL_FIXTURE_TRACK);
    expect(rebuilt).toStrictEqual(EIGHT_CAR_SCHEDULE);
  });
});
