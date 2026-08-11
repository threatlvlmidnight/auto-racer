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