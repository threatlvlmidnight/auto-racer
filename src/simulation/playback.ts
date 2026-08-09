import type { ContestResult, LapBreakdown, OfferedItem } from "./types";

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
  lap: LapBreakdown,
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