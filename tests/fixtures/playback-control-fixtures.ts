import { generateTrack, type Track } from "../../src/simulation/tracks";
import type { ContestResult, LapBreakdown, NCarContestResult } from "../../src/simulation/types";
import { FixtureCar, ncarResult } from "./race-legibility-fixtures";
import {
  buildNCarPlaybackSchedule,
  buildPlaybackSchedule,
  nCarBoundaryView,
  twoCarBoundaryView,
  type NCarPlaybackSchedule,
  type PlaybackBoundaryView,
  type PlaybackSchedule,
  type PlaybackSpeed,
  RACE_ANIMATION_SECONDS,
} from "../../src/simulation/playback";

/**
 * 030-race-playback-controls Phase 1 (T002): immutable, deterministic fixtures
 * that lock the pre-feature 20-second schedule semantics for both the two-car
 * Test Day path (`buildPlaybackSchedule`) and the eight-car scored path
 * (`buildNCarPlaybackSchedule`). Every lap time is an author-supplied exact
 * number (no item RNG) chosen so the shared scale factor is exactly `0.5` and
 * every car's visual lap boundaries are clean cumulative values — making the
 * pinned baselines in `playback-controls-baseline.test.ts` trivially auditable.
 *
 * `scaleFactor = RACE_ANIMATION_SECONDS / maxTime = 20 / 40 = 0.5`, so the
 * slowest car (the player, `4 s/lap × 10 = 40 s`) finishes at exactly `20 s` —
 * the legacy whole-race duration `ContestScene` consumes at `1.0×` today and
 * `PresentationClock` will consume at `1×` (0.5× real) after Phase 3.
 */
export const LEGACY_WHOLE_RACE_SECONDS = RACE_ANIMATION_SECONDS;
export const CONTROL_FIXTURE_SCALE_FACTOR = 0.5;
export const CONTROL_FIXTURE_LAP_COUNT = 10;
export const CONTROL_FIXTURE_TRACK: Track = generateTrack(1, 1);

// --- Two-car result (Test Day / buildPlaybackSchedule path) ----------------

/** Player `3 s/lap` (30 s total, faster); ghost `4 s/lap` (40 s, slower). */
const TWO_CAR_LAP_TIME_PLAYER = 3;
const TWO_CAR_LAP_TIME_GHOST = 4;

function twoCarLapBreakdowns(): LapBreakdown[] {
  return Array.from({ length: CONTROL_FIXTURE_LAP_COUNT }, (_, index) => ({
    lap: index + 1,
    playerLapTime: TWO_CAR_LAP_TIME_PLAYER,
    ghostLapTime: TWO_CAR_LAP_TIME_GHOST,
    firedItems: [],
  }));
}

export const TWO_CAR_RESULT: ContestResult = {
  lapCount: CONTROL_FIXTURE_LAP_COUNT,
  playerTime: TWO_CAR_LAP_TIME_PLAYER * CONTROL_FIXTURE_LAP_COUNT,
  ghostTime: TWO_CAR_LAP_TIME_GHOST * CONTROL_FIXTURE_LAP_COUNT,
  gap: (TWO_CAR_LAP_TIME_PLAYER - TWO_CAR_LAP_TIME_GHOST) * CONTROL_FIXTURE_LAP_COUNT,
  outcome: "win",
  board: [],
  storage: [],
  laps: twoCarLapBreakdowns(),
};

export const TWO_CAR_SCHEDULE: PlaybackSchedule = buildPlaybackSchedule(TWO_CAR_RESULT);
export const TWO_CAR_BOUNDARY_VIEW: PlaybackBoundaryView = twoCarBoundaryView(
  TWO_CAR_SCHEDULE,
  TWO_CAR_RESULT,
);

// --- Eight-car result (scored / buildNCarPlaybackSchedule path) ------------

/**
 * Eight cars, ten laps each. The player is the slowest (`4 s/lap = 40 s`) so
 * `maxTime = 40` and `scaleFactor = 0.5`; the seven rivals are faster with
 * distinct lap times so each crosses the line at a unique schedule time. Input
 * order is also the tie-break priority (`tieBreakOrder`); `ncarResult` sorts
 * the final `cars` array by `time` ascending, so the player finishes P8.
 */
const EIGHT_CAR_LAP_TIMES: FixtureCar[] = [
  { id: "player", role: "player", name: "You", color: "#ffd447", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(4) },
  { id: "rival-1", role: "rival", name: "Alpha", color: "#7cc", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(2) },
  { id: "rival-2", role: "rival", name: "Bravo", color: "#c7c", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(2.25) },
  { id: "rival-3", role: "rival", name: "Charlie", color: "#7c7", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(2.5) },
  { id: "rival-4", role: "rival", name: "Delta", color: "#77c", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(2.75) },
  { id: "rival-5", role: "rival", name: "Echo", color: "#cc7", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(3) },
  { id: "rival-6", role: "rival", name: "Foxtrot", color: "#c97", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(3.25) },
  { id: "rival-7", role: "rival", name: "Golf", color: "#97c", lapTimes: Array(CONTROL_FIXTURE_LAP_COUNT).fill(3.5) },
];

export const EIGHT_CAR_RESULT: NCarContestResult = ncarResult(EIGHT_CAR_LAP_TIMES, CONTROL_FIXTURE_TRACK);
export const EIGHT_CAR_SCHEDULE: NCarPlaybackSchedule = buildNCarPlaybackSchedule(
  EIGHT_CAR_RESULT,
  CONTROL_FIXTURE_TRACK,
);
export const EIGHT_CAR_BOUNDARY_VIEW: PlaybackBoundaryView = nCarBoundaryView(
  EIGHT_CAR_SCHEDULE,
  EIGHT_CAR_RESULT,
);

// --- Delta sequences (advancePresentationClock) ---------------------------

/** A standard 60 fps frame in real seconds. */
export const STANDARD_FRAME_DELTA_SECONDS = 1 / 60;

/**
 * A monotonic real-time delta sequence (`10 × 0.1 s = 1.0 s` total) used to
 * prove advancing the clock frame-by-frame is monotonic and never jumps
 * (Phase 2 T007; Phase 5 T032).
 */
export const DELTA_SEQUENCE: readonly number[] = Array.from({ length: 10 }, () => 0.1);

/**
 * Two interval-equivalent delta sequences covering the same `1.0 s` of real
 * time — one delayed large frame and ten small frames.
 * `crossedPlaybackBoundaries` must emit the identical boundary set for both
 * regardless of frame size (contract §4, Phase 2 T008).
 */
export const INTERVAL_EQUIVALENT_DELTAS: { name: string; deltas: readonly number[] }[] = [
  { name: "one-large-frame", deltas: [1] },
  { name: "ten-small-frames", deltas: Array.from({ length: 10 }, () => 0.1) },
];

// --- Speed sequence (selectPresentationSpeed) -----------------------------

/**
 * A fixed `normal → fast → normal` transition sequence used to prove speed
 * selection is idempotent and never mutates schedule time (Phase 2 T007;
 * Phase 5 T032).
 */
export const SPEED_SEQUENCE: readonly PlaybackSpeed[] = ["normal", "fast", "normal"];
