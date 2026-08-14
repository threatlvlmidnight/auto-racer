import { describe, expect, it } from "vitest";
import {
  buildPlaybackSchedule,
  frameStateAt,
  maxFinishScheduleTime,
} from "../../src/simulation/playback";
import { practiceContestControlPlan } from "../../src/scenes/practicePresentation";
import {
  LEGACY_WHOLE_RACE_SECONDS,
  TWO_CAR_BOUNDARY_VIEW,
  TWO_CAR_RESULT,
  TWO_CAR_SCHEDULE,
} from "../fixtures/playback-control-fixtures";

/**
 * 030-race-playback-controls Phase 1 (T004): pre-feature Test Day
 * (`PracticeContestScene`) control and playback baselines. The scene currently
 * cycles speed `1× → 2× → 4× → 1×`, pauses on `SPACE`, skips on `S`
 * (`elapsedSeconds = Number.POSITIVE_INFINITY`), and cancels on `ESC` via
 * `cancelPracticeSession` + `practiceReturnData`. No headless Phaser harness
 * exists in this repo, so these baselines lock the *pure* layers the scene
 * consumes — the two-car `buildPlaybackSchedule` schedule, the
 * `practiceContestControlPlan` control model (which carries the Cancel/Pause/
 * Speed/Skip ids, keyboard bindings, and the `focusVisible` flag), and the
 * `frameStateAt` skip target — plus a characterization of the in-scene speed
 * cycle arithmetic that Phase 5 will normalize to `1× ↔ 2×`.
 */

// Player: 0.5 × 3 s = 1.5 s per lap.
const TWO_CAR_PLAYER_BOUNDARIES = [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15];
// Ghost: 0.5 × 4 s = 2 s per lap (the slowest car → finishes at the 20 s duration).
const TWO_CAR_GHOST_BOUNDARIES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

describe("baseline: Test Day two-car schedule and controls before feature 030 (T004)", () => {
  it("pins the 2-car 0.5 scale factor and player/ghost visual lap boundaries", () => {
    expect(TWO_CAR_SCHEDULE.scaleFactor).toBe(0.5); // 20 / max(30, 40)
    expect(TWO_CAR_SCHEDULE.player.visualLapBoundaries).toEqual(TWO_CAR_PLAYER_BOUNDARIES);
    expect(TWO_CAR_SCHEDULE.ghost.visualLapBoundaries).toEqual(TWO_CAR_GHOST_BOUNDARIES);
  });

  it("pins the 2-car legacy 20-second whole-race duration (ghost finishes last)", () => {
    expect(maxFinishScheduleTime(TWO_CAR_BOUNDARY_VIEW)).toBe(LEGACY_WHOLE_RACE_SECONDS);
    expect(maxFinishScheduleTime(TWO_CAR_BOUNDARY_VIEW)).toBe(20);
  });

  it("keeps the 2-car schedule byte-identical across repeated builds (determinism)", () => {
    expect(buildPlaybackSchedule(TWO_CAR_RESULT)).toStrictEqual(TWO_CAR_SCHEDULE);
  });

  it("pins the practiceContestControlPlan control model (Cancel/Pause/Skip; speed/F removed by feature 030)", () => {
    expect(practiceContestControlPlan()).toEqual([
      { id: "cancel", label: "CANCEL", order: 0, enabled: true, disabledReason: null, keyBinding: "Escape", pointer: true, touch: true, focusVisible: true },
      { id: "pause", label: "PAUSE", order: 1, enabled: true, disabledReason: null, keyBinding: "Space", pointer: true, touch: true, focusVisible: true },
      { id: "skip", label: "SKIP", order: 2, enabled: true, disabledReason: null, keyBinding: "S", pointer: true, touch: true, focusVisible: true },
    ]);
  });

  /**
   * Characterization (golden master) of `PracticeContestScene.changeSpeed`:
   * `speed = speed === 1 ? 2 : speed === 2 ? 4 : 1`. The arithmetic currently
   * lives only in the Phaser scene (no pure harness), so this records the
   * pre-feature contract for Phase 5 to cite as superseded when the cycle is
   * normalized to the two-value `1× ↔ 2×` (`PlaybackSpeed`) domain.
   */
  it("characterizes the pre-feature in-scene speed cycle 1× → 2× → 4× → 1× (superseded by Phase 5)", () => {
    const cycle = (speed: number) => (speed === 1 ? 2 : speed === 2 ? 4 : 1);
    expect(cycle(1)).toBe(2);
    expect(cycle(2)).toBe(4);
    expect(cycle(4)).toBe(1);
    // Three applications complete one full cycle back to the start.
    expect(cycle(cycle(cycle(1)))).toBe(1);
  });

  it("pins the skip target: frameStateAt(Infinity) finishes both cars identically to the natural end", () => {
    const finalBoundary = maxFinishScheduleTime(TWO_CAR_BOUNDARY_VIEW);
    const natural = frameStateAt(TWO_CAR_SCHEDULE, TWO_CAR_RESULT, finalBoundary, -1);
    const skipped = frameStateAt(TWO_CAR_SCHEDULE, TWO_CAR_RESULT, Number.POSITIVE_INFINITY, -1);

    expect(skipped.player).toStrictEqual(natural.player);
    expect(skipped.ghost).toStrictEqual(natural.ghost);
    expect(skipped.liveGap).toBe(natural.liveGap);
    expect(skipped.player.finished).toBe(true);
    expect(skipped.ghost.finished).toBe(true);
  });
});
