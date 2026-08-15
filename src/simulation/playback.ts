import type { Track } from "./tracks";
import type { CarRole, ContestResult, FiredItem, NCarContestResult, OfferedItem } from "./types";

export const RACE_ANIMATION_SECONDS = 20;
export const MIN_VISUAL_LAP_SECONDS = 0.5;

export interface CarSchedule {
  visualLapBoundaries: number[];
  lapTimes: number[];
}

export interface PlaybackSchedule {
  scaleFactor: number;
  player: CarSchedule;
  ghost: CarSchedule;
}

export interface CarProgress {
  lapIndex: number;
  lapProgress: number;
  finished: boolean;
}

export interface CalloutEvent {
  item: OfferedItem;
  contribution: number;
}

export interface FrameState {
  player: CarProgress;
  ghost: CarProgress;
  liveGap: number;
  newCallouts: CalloutEvent[];
}

function buildCarSchedule(lapTimes: number[], scaleFactor: number): CarSchedule {
  let elapsed = 0;
  const visualLapBoundaries = lapTimes.map((lapTime) => {
    elapsed += Math.max(MIN_VISUAL_LAP_SECONDS, scaleFactor * lapTime);
    return elapsed;
  });

  return { visualLapBoundaries, lapTimes };
}

export function buildPlaybackSchedule(result: ContestResult): PlaybackSchedule {
  const scaleFactor = RACE_ANIMATION_SECONDS / Math.max(result.playerTime, result.ghostTime);
  const playerLapTimes = result.laps.map((lap) => lap.playerLapTime);
  const ghostLapTimes = result.laps.map((lap) => lap.ghostLapTime);

  return {
    scaleFactor,
    player: buildCarSchedule(playerLapTimes, scaleFactor),
    ghost: buildCarSchedule(ghostLapTimes, scaleFactor),
  };
}

export function carProgressAt(
  carSchedule: CarSchedule,
  visualTimeSeconds: number,
): CarProgress {
  const finalBoundary =
    carSchedule.visualLapBoundaries[carSchedule.visualLapBoundaries.length - 1] ?? 0;
  if (visualTimeSeconds >= finalBoundary) {
    return {
      lapIndex: carSchedule.visualLapBoundaries.length,
      lapProgress: 1,
      finished: true,
    };
  }

  const lapIndex = carSchedule.visualLapBoundaries.findIndex(
    (boundary) => boundary >= visualTimeSeconds,
  );
  const lapStart = lapIndex === 0 ? 0 : carSchedule.visualLapBoundaries[lapIndex - 1];
  const lapEnd = carSchedule.visualLapBoundaries[lapIndex];
  const lapProgress = Math.min(
    1,
    Math.max(0, (visualTimeSeconds - lapStart) / (lapEnd - lapStart)),
  );

  return { lapIndex, lapProgress, finished: false };
}

export function cumulativeSimulatedTimeAt(
  carSchedule: CarSchedule,
  visualTimeSeconds: number,
): number {
  const progress = carProgressAt(carSchedule, visualTimeSeconds);
  if (progress.finished) {
    return carSchedule.lapTimes.reduce((sum, lapTime) => sum + lapTime, 0);
  }

  const completedTime = carSchedule.lapTimes
    .slice(0, progress.lapIndex)
    .reduce((sum, lapTime) => sum + lapTime, 0);
  return completedTime + progress.lapProgress * carSchedule.lapTimes[progress.lapIndex];
}

export function calloutEventsForLap(
  lap: { firedItems: FiredItem[] },
  itemsById: Map<string, OfferedItem>,
): CalloutEvent[] {
  const candidates = lap.firedItems.flatMap(({ id, contribution }) => {
    const item = itemsById.get(id);
    return item ? [{ item, contribution }] : [];
  });

  // Tags of direct (non-buff) items that fired this lap — used to gate buff flashes.
  const firedDirectTags = new Set(
    candidates
      .filter(({ item }) => !item.buff && item.identityTag !== undefined)
      .map(({ item }) => item.identityTag!),
  );

  return candidates.filter(
    ({ item }) =>
      !item.buff ||
      (item.identityTag !== undefined && firedDirectTags.has(item.identityTag)),
  );
}

export function liveGapAt(schedule: PlaybackSchedule, visualTimeSeconds: number): number {
  return (
    cumulativeSimulatedTimeAt(schedule.player, visualTimeSeconds) -
    cumulativeSimulatedTimeAt(schedule.ghost, visualTimeSeconds)
  );
}

export function frameStateAt(
  schedule: PlaybackSchedule,
  result: ContestResult,
  visualTimeSeconds: number,
  lastRenderedPlayerLapIndex: number,
): FrameState {
  const player = carProgressAt(schedule.player, visualTimeSeconds);
  const itemsById = new Map(
    [...result.board, ...result.storage].map((item) => [item.id, item]),
  );
  const enteredLap =
    player.lapIndex !== lastRenderedPlayerLapIndex ? result.laps[player.lapIndex] : undefined;

  return {
    player,
    ghost: carProgressAt(schedule.ghost, visualTimeSeconds),
    liveGap: liveGapAt(schedule, visualTimeSeconds),
    newCallouts: enteredLap ? calloutEventsForLap(enteredLap, itemsById) : [],
  };
}

// --- Feature 012: N-car playback --------------------------------------
// Additive alongside the 2-car functions above (FR-008/FR-011): Test
// Day/Practice keeps using buildPlaybackSchedule/frameStateAt against a
// single SampleGhost; the scored PvP path uses these instead.

export interface CarPlaybackSchedule {
  id: string;
  role: CarRole;
  name: string;
  color: string;
  schedule: CarSchedule;
}

export interface NCarPlaybackSchedule {
  scaleFactor: number;
  cars: CarPlaybackSchedule[];
  /** 013-race-spectacle: the caller's generated track, attached once per schedule so every consumer reads the same track. */
  track: Track;
}

export function buildNCarPlaybackSchedule(
  result: NCarContestResult,
  track: Track,
): NCarPlaybackSchedule {
  const maxTime = Math.max(...result.cars.map((car) => car.time));
  const scaleFactor = RACE_ANIMATION_SECONDS / maxTime;

  return {
    scaleFactor,
    cars: result.cars.map((car) => ({
      id: car.id,
      role: car.role,
      name: car.name,
      color: car.color,
      schedule: buildCarSchedule(car.laps.map((lap) => lap.time), scaleFactor),
    })),
    track,
  };
}

/**
 * 013-race-spectacle: the single source of "what's the current order" — the
 * live standings sidebar and ticker lead-change detection both call this,
 * never a second independent ordering (contract §3, data-model.md).
 */
export interface RankedCar {
  id: string;
  position: number;
  cumulativeTime: number;
}

export function standingsAt(schedule: NCarPlaybackSchedule, visualTimeSeconds: number): RankedCar[] {
  // Tie-break: player first (mirrors resolveContest's own fixed-roster-order
  // rule), then stable id order for rival-vs-rival ties. NOT schedule.cars'
  // own array order — that order is already the FINAL ranked result, so
  // using it here would make whichever car eventually wins the race also
  // win every live tie, including at t=0 before any real gap has formed.
  const roleRank = (role: CarRole) => (role === "player" ? 0 : 1);
  const withTimes = schedule.cars.map((car) => ({
    id: car.id,
    role: car.role,
    cumulativeTime: cumulativeSimulatedTimeAt(car.schedule, visualTimeSeconds),
  }));
  const ranked = [...withTimes].sort((a, b) =>
    a.cumulativeTime - b.cumulativeTime
    || roleRank(a.role) - roleRank(b.role)
    || a.id.localeCompare(b.id)
  );

  return ranked.map(({ id, cumulativeTime }, index) => ({ id, cumulativeTime, position: index + 1 }));
}

export interface NCarProgress {
  id: string;
  role: CarRole;
  name: string;
  color: string;
  progress: CarProgress;
  cumulativeTime: number;
}

/** 013-race-spectacle: a single commentary entry (data-model.md "Ticker Line"; contract §3). */
export interface TickerLine {
  t: number;
  carId: string;
  kind: "player-fired" | "took-lead" | "finished";
  text: string;
}

export interface NCarFrameState {
  cars: NCarProgress[];
  /** 1-indexed live rank among all cars, by cumulative simulated time ascending. */
  playerRank: number;
  leaderName: string;
  /** The live leader's cumulative time subtracted from the player's own; 0 while leading. */
  playerGapToLeader: number;
  allFinished: boolean;
  /** Scoped to the player's own car only — never populated for a rival (FR-005). */
  newCallouts: CalloutEvent[];
  /** 013-race-spectacle: identical to standingsAt(schedule, visualTimeSeconds) — one source of truth. */
  standings: RankedCar[];
  /** 013-race-spectacle: curated commentary for this frame (FR-006). */
  newTickerLines: TickerLine[];
}

function deriveTickerLines(
  schedule: NCarPlaybackSchedule,
  visualTimeSeconds: number,
  standings: RankedCar[],
  playerCallouts: CalloutEvent[],
  finishedCarIds: readonly string[],
  previousStandings: readonly RankedCar[] | null,
  previousFinishedCarIds: readonly string[],
): TickerLine[] {
  const carsById = new Map(schedule.cars.map((car) => [car.id, car]));
  const lines: TickerLine[] = [];

  playerCallouts.forEach((event) => {
    lines.push({
      t: visualTimeSeconds,
      carId: "player",
      kind: "player-fired",
      text: `You fire the ${event.item.name}.`,
    });
  });

  const previousLeaderId = previousStandings?.[0]?.id;
  const currentLeaderId = standings[0]?.id;
  if (previousStandings && currentLeaderId && currentLeaderId !== previousLeaderId) {
    const car = carsById.get(currentLeaderId);
    if (car) {
      const name = car.role === "player" ? "You" : car.name;
      lines.push({
        t: visualTimeSeconds,
        carId: car.id,
        kind: "took-lead",
        text: `${name} take${car.role === "player" ? "" : "s"} the lead!`,
      });
    }
  }

  const previouslyFinished = new Set(previousFinishedCarIds);
  finishedCarIds
    .filter((id) => !previouslyFinished.has(id))
    .forEach((id) => {
      const car = carsById.get(id);
      const position = standings.find((entry) => entry.id === id)?.position;
      if (!car) return;
      const name = car.role === "player" ? "You" : car.name;
      const verb = car.role === "player" ? "cross" : "crosses";
      lines.push({
        t: visualTimeSeconds,
        carId: id,
        kind: "finished",
        text: `${name} ${verb} the line${position ? ` — P${position}` : ""}.`,
      });
    });

  return lines;
}

// --- 027-race-legibility-integrity: equal-lap checkpoint projection -------
// Replaces frame-level standings as the primary race ranking model
// (contract §2/§3, Decision 1/2/6). Pure and framework-free: reads only
// `NCarContestResult.cars[].laps` and `tieBreakOrder`, never a playback
// schedule, visual time, or geometry.

export type CheckpointProjectionErrorCode = "invalid-lap" | "malformed-laps";

/** Typed, inspectable failure for an out-of-range lap or under-recorded car (contract §2). */
export class CheckpointProjectionError extends Error {
  constructor(
    public readonly code: CheckpointProjectionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckpointProjectionError";
  }
}

export interface CheckpointCar {
  carId: string;
  role: CarRole;
  name: string;
  color: string;
  completedLap: number;
  cumulativeTime: number;
  position: number;
  /** car.cumulativeTime - player.cumulativeTime, signed (data-model.md). */
  gapToPlayer: number;
}

export interface CheckpointProjection {
  completedLap: number;
  lapCount: number;
  /** Ranked ascending by cumulative time, ties broken by result.tieBreakOrder. */
  cars: readonly CheckpointCar[];
  playerPosition: number;
  player: CheckpointCar;
  ahead: CheckpointCar | null;
  behind: CheckpointCar | null;
}

/**
 * Every car's cumulative simulated time through exactly `completedLap`,
 * ranked ascending and tie-broken by `result.tieBreakOrder` — the same
 * policy the final result already uses (Decision 3). Never reads playback
 * schedules, visual time, progress, or geometry (contract §2).
 */
export function checkpointProjection(
  result: NCarContestResult,
  completedLap: number,
): CheckpointProjection {
  if (!Number.isInteger(completedLap) || completedLap < 1 || completedLap > result.lapCount) {
    throw new CheckpointProjectionError(
      "invalid-lap",
      `completedLap ${completedLap} must be an integer within 1..${result.lapCount}`,
    );
  }

  const withCumulative = result.cars.map((car) => {
    if (car.laps.length < completedLap) {
      throw new CheckpointProjectionError(
        "malformed-laps",
        `Car ${car.id} has ${car.laps.length} recorded laps, fewer than the requested checkpoint ${completedLap}`,
      );
    }
    const cumulativeTime = car.laps
      .slice(0, completedLap)
      .reduce((sum, lap) => sum + lap.time, 0);
    return { car, cumulativeTime };
  });

  const tieBreakIndex = new Map(result.tieBreakOrder.map((id, index) => [id, index]));
  const ranked = [...withCumulative].sort((a, b) =>
    a.cumulativeTime - b.cumulativeTime
    || (tieBreakIndex.get(a.car.id) ?? Number.MAX_SAFE_INTEGER) - (tieBreakIndex.get(b.car.id) ?? Number.MAX_SAFE_INTEGER)
  );

  const playerCumulative = withCumulative.find(({ car }) => car.role === "player")!.cumulativeTime;
  const cars: CheckpointCar[] = ranked.map(({ car, cumulativeTime }, index) => ({
    carId: car.id,
    role: car.role,
    name: car.name,
    color: car.color,
    completedLap,
    cumulativeTime,
    position: index + 1,
    gapToPlayer: cumulativeTime - playerCumulative,
  }));

  const playerIndex = cars.findIndex((car) => car.role === "player");
  const player = cars[playerIndex];
  return {
    completedLap,
    lapCount: result.lapCount,
    cars,
    playerPosition: player.position,
    player,
    ahead: playerIndex > 0 ? cars[playerIndex - 1] : null,
    behind: playerIndex < cars.length - 1 ? cars[playerIndex + 1] : null,
  };
}

/**
 * The player's own 1-indexed completed-lap count at one presentation
 * instant — `CarProgress.lapIndex` already IS that count (0 before any lap
 * completes, capped at `lapCount` once finished; see the T005 diagnosis in
 * research.md for why the completing-lap instant reads this way).
 */
export function latestCompletedPlayerLap(progress: CarProgress, lapCount: number): number {
  return Math.min(progress.lapIndex, lapCount);
}

const AWAITING_FIRST_SPLIT: LiveProjectionState = { kind: "awaiting-first-split", label: "Awaiting Lap 1 Split" };

export type LiveProjectionState =
  | { kind: "awaiting-first-split"; label: "Awaiting Lap 1 Split" }
  | {
    kind: "projected";
    current: CheckpointProjection;
    previous: CheckpointProjection | null;
    change: "gained" | "lost" | "held" | "first-split";
    /** Always >= 0; magnitude only — `change` already carries the direction. */
    placesChanged: number;
  };

/**
 * Publishes a new checkpoint projection only when the player's completed
 * lap count has increased since `previous` — held stable otherwise, even
 * across many repeated calls within the same lap (contract §3, Decision 2).
 * A single call that spans several boundaries (a low-frame-rate update)
 * publishes only the latest valid checkpoint once; no intermediate one is
 * ever synthesized or replayed.
 */
export function updateLiveProjection(
  previous: LiveProjectionState,
  result: NCarContestResult,
  playerProgress: CarProgress,
): LiveProjectionState {
  const latestLap = latestCompletedPlayerLap(playerProgress, result.lapCount);
  if (latestLap < 1) {
    return previous.kind === "awaiting-first-split" ? previous : AWAITING_FIRST_SPLIT;
  }

  const previousProjection = previous.kind === "projected" ? previous.current : null;
  if (previousProjection && previousProjection.completedLap === latestLap) {
    return previous;
  }

  const current = checkpointProjection(result, latestLap);
  return updateLiveProjectionFromCheckpoint(previous, current);
}

/** Applies an already-recorded checkpoint boundary to the held projection. */
export function updateLiveProjectionFromCheckpoint(
  previous: LiveProjectionState,
  current: CheckpointProjection,
): LiveProjectionState {
  const previousProjection = previous.kind === "projected" ? previous.current : null;
  if (previousProjection?.completedLap === current.completedLap) return previous;
  if (!previousProjection) {
    return { kind: "projected", current, previous: null, change: "first-split", placesChanged: 0 };
  }

  const placesChanged = previousProjection.playerPosition - current.playerPosition;
  const change = placesChanged > 0 ? "gained" : placesChanged < 0 ? "lost" : "held";
  return { kind: "projected", current, previous: previousProjection, change, placesChanged: Math.abs(placesChanged) };
}

export function nCarFrameStateAt(
  schedule: NCarPlaybackSchedule,
  result: NCarContestResult,
  visualTimeSeconds: number,
  lastRenderedPlayerLapIndex: number,
  previousStandings: readonly RankedCar[] | null = null,
  previousFinishedCarIds: readonly string[] = [],
): NCarFrameState {
  const cars: NCarProgress[] = schedule.cars.map((car) => ({
    id: car.id,
    role: car.role,
    name: car.name,
    color: car.color,
    progress: carProgressAt(car.schedule, visualTimeSeconds),
    cumulativeTime: cumulativeSimulatedTimeAt(car.schedule, visualTimeSeconds),
  }));
  const ranked = [...cars].sort((a, b) => a.cumulativeTime - b.cumulativeTime);
  const leader = ranked[0];
  const player = cars.find((car) => car.role === "player")!;
  const playerRank = ranked.findIndex((car) => car.id === player.id) + 1;

  const itemsById = new Map(
    [...result.board, ...result.storage].map((item) => [item.id, item]),
  );
  const playerResult = result.cars.find((car) => car.role === "player")!;
  const enteredLap = player.progress.lapIndex !== lastRenderedPlayerLapIndex
    ? playerResult.laps[player.progress.lapIndex]
    : undefined;
  const newCallouts = enteredLap ? calloutEventsForLap(enteredLap, itemsById) : [];
  const standings = standingsAt(schedule, visualTimeSeconds);
  const finishedCarIds = cars.filter((car) => car.progress.finished).map((car) => car.id);

  return {
    cars,
    playerRank,
    leaderName: leader.name,
    playerGapToLeader: player.cumulativeTime - leader.cumulativeTime,
    allFinished: cars.every((car) => car.progress.finished),
    newCallouts,
    standings,
    newTickerLines: deriveTickerLines(
      schedule,
      visualTimeSeconds,
      standings,
      newCallouts,
      finishedCarIds,
      previousStandings,
      previousFinishedCarIds,
    ),
  };
}

// --- Feature 030: race playback controls ----------------------------------
// A race-local, presentation-only clock (data-model.md "PresentationClock").
// Its `1×` (normal) rate consumes the immutable playback schedule at half the
// legacy rate and its `2×` (fast) rate at the legacy rate. Speed never carries
// simulation authority (contract §1): it only scales how quickly presentation
// consumes already-resolved evidence.

export type PlaybackSpeed = "normal" | "fast";

export interface PlaybackSpeedDescriptor {
  value: PlaybackSpeed;
  /** "1×" or "2×". */
  label: string;
  /** Keyboard shortcut glyph: "1" or "2". */
  shortcut: string;
  /** Schedule-time multiplier consumed by PresentationClock.advance. */
  multiplier: number;
}

/** Exactly two speeds, in stable authored order (contract §2). */
export const PLAYBACK_SPEEDS: readonly PlaybackSpeedDescriptor[] = [
  { value: "normal", label: "1×", shortcut: "1", multiplier: 0.5 },
  { value: "fast", label: "2×", shortcut: "2", multiplier: 1.0 },
];

/** Rejects any value outside the closed {normal, fast} domain (data-model.md). */
export function isPlaybackSpeed(value: unknown): value is PlaybackSpeed {
  return value === "normal" || value === "fast";
}

export function playbackSpeedDescriptor(speed: PlaybackSpeed): PlaybackSpeedDescriptor {
  if (!isPlaybackSpeed(speed)) {
    throw new Error(`Invalid playback speed: ${String(speed)}`);
  }
  return PLAYBACK_SPEEDS.find((entry) => entry.value === speed)!;
}

/** The closed interval evidence one rendered update needs to derive crossed boundaries. */
export interface PlaybackAdvance {
  previousScheduleTimeSeconds: number;
  scheduleTimeSeconds: number;
  speed: PlaybackSpeed;
  /**
   * True only for the very first positive-time advance, which carries the
   * one-time time-zero initialization batch (data-model.md "CrossedPlaybackEvent").
   */
  isFirstAdvance: boolean;
}

/** Immutable, framework-free presentation clock (data-model.md "PresentationClock"). */
export interface PresentationClock {
  /** Finite monotonic schedule time already consumed; never moves backward. */
  readonly scheduleTimeSeconds: number;
  readonly speed: PlaybackSpeed;
  /** True once the time-zero initialization batch has been emitted. */
  readonly initialized: boolean;
}

/** Every new playback scene initializes to `2×`; `1×` remains selectable. */
export function createPresentationClock(speed: PlaybackSpeed = "fast"): PresentationClock {
  if (!isPlaybackSpeed(speed)) {
    throw new Error(`Invalid playback speed: ${String(speed)}`);
  }
  return { scheduleTimeSeconds: 0, speed, initialized: false };
}

/**
 * Replaces `speed` only; never alters `scheduleTimeSeconds`. Re-selecting the
 * active speed returns the same (equivalent) clock (data-model.md "selectSpeed").
 */
export function selectPlaybackSpeed(
  clock: PresentationClock,
  speed: PlaybackSpeed,
): PresentationClock {
  if (!isPlaybackSpeed(speed)) {
    throw new Error(`Invalid playback speed: ${String(speed)}`);
  }
  if (speed === clock.speed) return clock;
  return { scheduleTimeSeconds: clock.scheduleTimeSeconds, speed, initialized: clock.initialized };
}

/**
 * Advances schedule time by `realDeltaSeconds × speedMultiplier`.
 * Rejects negative or non-finite deltas; zero is valid and idempotent. Only the
 * first positive-time advance transitions `initialized` and reports the
 * time-zero batch (contract §3, data-model.md).
 */
export function advancePresentationClock(
  clock: PresentationClock,
  realDeltaSeconds: number,
): { clock: PresentationClock; advance: PlaybackAdvance } {
  if (!Number.isFinite(realDeltaSeconds) || realDeltaSeconds < 0) {
    throw new Error(`Invalid playback delta: ${realDeltaSeconds}`);
  }
  const multiplier = playbackSpeedDescriptor(clock.speed).multiplier;
  const previousScheduleTimeSeconds = clock.scheduleTimeSeconds;
  const scheduleTimeSeconds = previousScheduleTimeSeconds + realDeltaSeconds * multiplier;
  const isFirstAdvance = realDeltaSeconds > 0 && !clock.initialized;
  return {
    clock: {
      scheduleTimeSeconds,
      speed: clock.speed,
      initialized: clock.initialized || realDeltaSeconds > 0,
    },
    advance: { previousScheduleTimeSeconds, scheduleTimeSeconds, speed: clock.speed, isFirstAdvance },
  };
}

// --- Feature 030: crossed-boundary derivation ------------------------------
// Pure, framework-free enumeration of every recorded playback boundary in a
// monotonic interval (contract §4, data-model.md "CrossedPlaybackEvent"). A
// delayed frame and many small frames covering the same interval identify the
// same boundary set exactly once, in deterministic order, regardless of speed.

export interface PlaybackBoundaryCar {
  id: string;
  role: CarRole;
  name: string;
  schedule: CarSchedule;
}

export interface PlaybackBoundaryView {
  lapCount: number;
  cars: readonly PlaybackBoundaryCar[];
  player: PlaybackBoundaryCar;
  /** Player laps carrying `firedItems`, parallel to the schedule's lap order. */
  playerLaps: readonly { firedItems: FiredItem[] }[];
  /** Item lookup for callout resolution. */
  itemsById: Map<string, OfferedItem>;
  /** Stable tie-break priority of car ids, player first (contract §4 ordering rule 2). */
  tieBreakOrder: readonly string[];
  /** Optional N-car checkpoint provider; Test Day passes none. */
  projectCheckpoint?: (completedLap: number) => CheckpointProjection;
}

export function nCarBoundaryView(
  schedule: NCarPlaybackSchedule,
  result: NCarContestResult,
): PlaybackBoundaryView {
  const playerCar = schedule.cars.find((car) => car.role === "player")!;
  const playerResult = result.cars.find((car) => car.role === "player")!;
  return {
    lapCount: result.lapCount,
    cars: schedule.cars.map((car) => ({
      id: car.id,
      role: car.role,
      name: car.name,
      schedule: car.schedule,
    })),
    player: {
      id: playerCar.id,
      role: playerCar.role,
      name: playerCar.name,
      schedule: playerCar.schedule,
    },
    playerLaps: playerResult.laps.map((lap) => ({ firedItems: lap.firedItems })),
    itemsById: new Map([...result.board, ...result.storage].map((item) => [item.id, item])),
    tieBreakOrder: result.tieBreakOrder,
    projectCheckpoint: (completedLap: number) => checkpointProjection(result, completedLap),
  };
}

export function twoCarBoundaryView(
  schedule: PlaybackSchedule,
  result: ContestResult,
): PlaybackBoundaryView {
  return {
    lapCount: result.lapCount,
    cars: [
      { id: "player", role: "player", name: "You", schedule: schedule.player },
      { id: "ghost", role: "rival", name: "Rival", schedule: schedule.ghost },
    ],
    player: { id: "player", role: "player", name: "You", schedule: schedule.player },
    playerLaps: result.laps.map((lap) => ({ firedItems: lap.firedItems })),
    itemsById: new Map([...result.board, ...result.storage].map((item) => [item.id, item])),
    tieBreakOrder: ["player", "ghost"],
  };
}

/** The finite schedule time at which the last car finishes (contract §7 Skip target). */
export function maxFinishScheduleTime(view: PlaybackBoundaryView): number {
  return view.cars.reduce((max, car) => {
    const last = car.schedule.visualLapBoundaries[car.schedule.visualLapBoundaries.length - 1] ?? 0;
    return Math.max(max, last);
  }, 0);
}

export type CrossedPlaybackEventKind =
  | "time-zero"
  | "player-lap"
  | "item-callout"
  | "checkpoint"
  | "car-finished"
  | "results-ready";

const CROSS_KIND_ORDER: Record<CrossedPlaybackEventKind, number> = {
  "time-zero": 0,
  "player-lap": 1,
  "item-callout": 2,
  checkpoint: 3,
  "car-finished": 4,
  "results-ready": 5,
};

export interface CrossedPlaybackEvent {
  kind: CrossedPlaybackEventKind;
  scheduleTime: number;
  /** 1-indexed lap the player entered/completed (player-lap, item-callout, checkpoint). */
  lap?: number;
  /** Finishing car id (car-finished). */
  carId?: string;
  /** Resolved callout (item-callout). */
  callout?: CalloutEvent;
  /** Checkpoint projection (checkpoint). */
  projection?: CheckpointProjection;
  /** Internal stable group id for ordering facts from one boundary together. */
  readonly boundaryKey: string;
}

function playerCallouts(view: PlaybackBoundaryView, lap: number): readonly CrossedPlaybackEvent[] {
  const lapIndex = lap - 1;
  const recorded = view.playerLaps[lapIndex];
  if (!recorded) return [];
  return calloutEventsForLap({ firedItems: recorded.firedItems }, view.itemsById).map((callout) => ({
    kind: "item-callout" as const,
    scheduleTime: 0,
    lap,
    callout,
    boundaryKey: `player-start-${lap}`,
  }));
}

function timeZeroEvents(view: PlaybackBoundaryView): CrossedPlaybackEvent[] {
  const events: CrossedPlaybackEvent[] = [
    { kind: "time-zero", scheduleTime: 0, boundaryKey: "init" },
    { kind: "player-lap", scheduleTime: 0, lap: 1, boundaryKey: "player-start-1" },
  ];
  events.push(...playerCallouts(view, 1).map((event) => ({ ...event, scheduleTime: 0 })));
  return events;
}

function inOpenInterval(value: number, previous: number, next: number): boolean {
  return value > previous && value <= next;
}

function intervalEvents(
  view: PlaybackBoundaryView,
  previous: number,
  next: number,
): CrossedPlaybackEvent[] {
  if (next <= previous) return [];
  const events: CrossedPlaybackEvent[] = [];
  const playerBoundaries = view.player.schedule.visualLapBoundaries;
  const lapCount = view.lapCount;

  // Player lap-start boundaries (entering lap m, m >= 2). Each also publishes the
  // checkpoint for the lap just completed (m - 1) and that lap's item callouts.
  for (let m = 2; m <= lapCount; m++) {
    const startBoundary = playerBoundaries[m - 2];
    if (startBoundary === undefined || !inOpenInterval(startBoundary, previous, next)) continue;
    events.push({
      kind: "player-lap",
      scheduleTime: startBoundary,
      lap: m,
      boundaryKey: `player-start-${m}`,
    });
    events.push(...playerCallouts(view, m).map((event) => ({ ...event, scheduleTime: startBoundary })));
    if (view.projectCheckpoint) {
      events.push({
        kind: "checkpoint",
        scheduleTime: startBoundary,
        lap: m - 1,
        projection: view.projectCheckpoint(m - 1),
        boundaryKey: `player-start-${m}`,
      });
    }
  }

  // Per-car finish boundaries. The player's finish also publishes the final
  // checkpoint (completed lapCount).
  const finish = maxFinishScheduleTime(view);
  for (const car of view.cars) {
    const lastBoundary = car.schedule.visualLapBoundaries[car.schedule.visualLapBoundaries.length - 1];
    if (lastBoundary === undefined || !inOpenInterval(lastBoundary, previous, next)) continue;
    if (car.role === "player" && view.projectCheckpoint) {
      events.push({
        kind: "checkpoint",
        scheduleTime: lastBoundary,
        lap: lapCount,
        projection: view.projectCheckpoint(lapCount),
        boundaryKey: "player-finish",
      });
    }
    events.push({
      kind: "car-finished",
      scheduleTime: lastBoundary,
      carId: car.id,
      boundaryKey: `car-finish-${car.id}`,
    });
  }

  // Results-ready once the last car finishes within this interval.
  if (finish > previous && finish <= next) {
    events.push({ kind: "results-ready", scheduleTime: finish, boundaryKey: "results-ready" });
  }

  return events;
}

function orderEvents(
  events: CrossedPlaybackEvent[],
  tieBreakOrder: readonly string[],
): CrossedPlaybackEvent[] {
  const rank = new Map(tieBreakOrder.map((id, index) => [id, index]));
  const groupRank = (key: string): number => {
    const match = key.match(/car-finish-(.+)$/);
    if (match) return rank.get(match[1]) ?? Number.MAX_SAFE_INTEGER;
    if (key === "player-finish" || key.startsWith("player-start") || key === "init") {
      return rank.get("player") ?? 0;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  return [...events].sort(
    (a, b) =>
      a.scheduleTime - b.scheduleTime
      || groupRank(a.boundaryKey) - groupRank(b.boundaryKey)
      || CROSS_KIND_ORDER[a.kind] - CROSS_KIND_ORDER[b.kind]
      || (a.lap ?? 0) - (b.lap ?? 0),
  );
}

/**
 * Enumerates every recorded boundary in `(previousScheduleTime, nextScheduleTime]`
 * exactly once, in deterministic order. When `includeInitialization` is true
 * (the first positive-time advance), the one-time time-zero batch is prepended.
 * Boundaries at `previousScheduleTime` are never re-emitted (contract §4).
 */
export function crossedPlaybackBoundaries(
  view: PlaybackBoundaryView,
  previousScheduleTime: number,
  nextScheduleTime: number,
  includeInitialization: boolean,
): CrossedPlaybackEvent[] {
  const events: CrossedPlaybackEvent[] = [];
  if (includeInitialization) events.push(...timeZeroEvents(view));
  events.push(...intervalEvents(view, previousScheduleTime, nextScheduleTime));
  return orderEvents(events, view.tieBreakOrder);
}

// --- Feature 030: race-local playback controller ---------------------------
// Composes the presentation clock, boundary view, and crossed-boundary
// consumption into one immutable, framework-free controller that encodes the
// data-model "State Lifecycle" both watched-race scenes delegate to. Keeping
// the per-frame advance / event / results-ready logic here (not in the Phaser
// scene) lets the Phase 3–4 integration tests prove timing, transitions, and
// immutable-evidence parity without a headless Phaser harness — the same
// convention the Phase 1 baselines establish (no scene is ever instantiated
// in tests; the pure layers the scenes consume are tested directly).

export interface PlaybackController {
  /** Immutable schedule/result evidence the controller consumes for one race. */
  readonly view: PlaybackBoundaryView;
  readonly clock: PresentationClock;
  /**
   * Crossed boundaries emitted by the most recent advance or skip, in
   * deterministic order. Replaced (never queued) each update, so there is no
   * cross-frame message queue (contract §5).
   */
  readonly lastEvents: readonly CrossedPlaybackEvent[];
  /** True once the results-ready boundary has been consumed; never reverts. */
  readonly resultsReady: boolean;
}

/**
 * Every new scored or Test Day playback initializes to the `2×` default
 * with no events and `resultsReady` false (data-model "State
 * Lifecycle"). The scene calls this in `create()` so each race gets a fresh
 * clock — no selection persists into another playback (contract §6).
 */
export function createPlaybackController(view: PlaybackBoundaryView): PlaybackController {
  return { view, clock: createPresentationClock("fast"), lastEvents: [], resultsReady: false };
}

/**
 * Advances the controller one real-time frame: advances the clock, derives the
 * crossed boundaries for the closed interval, and sets `resultsReady` once the
 * results-ready boundary is consumed. After `resultsReady`, every further
 * advance is a no-op returning the same controller — the scene navigates to
 * Results exactly once and playback never mutates post-finish (contract §5/§8,
 * Phase 4 T023). Zero deltas are valid and produce no events.
 */
export function advancePlaybackController(
  controller: PlaybackController,
  realDeltaSeconds: number,
): PlaybackController {
  if (controller.resultsReady) return controller;
  const { clock, advance } = advancePresentationClock(controller.clock, realDeltaSeconds);
  const events = crossedPlaybackBoundaries(
    controller.view,
    advance.previousScheduleTimeSeconds,
    advance.scheduleTimeSeconds,
    advance.isFirstAdvance,
  );
  const resultsReady = events.some((event) => event.kind === "results-ready");
  if (events.length === 0 && !resultsReady && clock === controller.clock) {
    return controller;
  }
  return {
    view: controller.view,
    clock,
    lastEvents: events,
    resultsReady: controller.resultsReady || resultsReady,
  };
}

/**
 * Replaces the controller's speed without altering schedule time or emitting
 * events. Idempotent: re-selecting the active speed returns the same controller
 * (contract §3, data-model "selectSpeed"). A no-op once results-ready so no
 * selection mutates finished playback.
 */
export function selectPlaybackControllerSpeed(
  controller: PlaybackController,
  speed: PlaybackSpeed,
): PlaybackController {
  if (controller.resultsReady || controller.clock.speed === speed) return controller;
  const clock = selectPlaybackSpeed(controller.clock, speed);
  return { view: controller.view, clock, lastEvents: controller.lastEvents, resultsReady: controller.resultsReady };
}

/**
 * Test Day Skip (contract §7): sets schedule time to the immutable schedule's
 * finite maximum finish boundary and emits every newly crossed boundary exactly
 * once, including the results-ready boundary. Never uses a non-finite clock
 * value. A no-op once results-ready. If already at/over the finish boundary
 * without results-ready (e.g. a prior advance landed exactly on finish), the
 * results-ready batch is still emitted.
 */
export function skipPlaybackController(controller: PlaybackController): PlaybackController {
  if (controller.resultsReady) return controller;
  const finish = maxFinishScheduleTime(controller.view);
  const previous = controller.clock.scheduleTimeSeconds;
  const includeInitialization = !controller.clock.initialized;
  const events = crossedPlaybackBoundaries(controller.view, previous, finish, includeInitialization);
  const resultsReady = events.some((event) => event.kind === "results-ready");
  return {
    view: controller.view,
    clock: { scheduleTimeSeconds: finish, speed: controller.clock.speed, initialized: true },
    lastEvents: events,
    resultsReady: controller.resultsReady || resultsReady,
  };
}
