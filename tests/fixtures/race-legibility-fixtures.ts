import { RIVAL_PROFILES } from "../../src/content/rivals";
import { generateTrack, type Track } from "../../src/simulation/tracks";
import type { CarResult, CarRole, ContestOutcome, NCarContestResult, RivalProfile } from "../../src/simulation/types";

/**
 * 027-race-legibility-integrity: shared fixtures for playback-integrity,
 * checkpoint-projection, and track-summary tests. Every rival draws real
 * items via resolveRivalBuild's own RNG, so exact-time scenarios use this
 * zero-slot roster (mirrors the existing local pattern in
 * tests/unit/{playback,contest}.test.ts).
 */
export const TIE_ROSTER: readonly RivalProfile[] = RIVAL_PROFILES.map((profile) => ({
  ...profile,
  levelScaling: () => ({ slotsToFill: 0, priceBias: "low" as const }),
}));

/** Real `generateTrack` output, not hand-authored segments — seeds chosen by direct search for the stated property. */
export const SIX_CORNER_TRACK: Track = generateTrack(1, 1);
export const TEN_CORNER_TRACK: Track = generateTrack(3, 1);
export const POWER_DEMAND_TRACK: Track = generateTrack(143, 1);
export const BRAKING_DEMAND_TRACK: Track = generateTrack(19, 1);
export const CORNERING_DEMAND_TRACK: Track = generateTrack(5, 1);

export interface FixtureCar {
  id: string;
  role: CarRole;
  name: string;
  color: string;
  lapTimes: number[];
}

/**
 * A fully controllable N-car result for exercising checkpoint math and
 * playback integrity without depending on resolveRivalBuild's item RNG —
 * every car's per-lap times are exact author-supplied numbers. Mirrors
 * playback.test.ts's existing `resultWithLapTimes` (2-car) scaled to N.
 * `cars` order is also this fixture's tie-break priority (Decision 3):
 * put "player" first, then the desired rival order.
 */
export function ncarResult(cars: readonly FixtureCar[], track: Track = SIX_CORNER_TRACK): NCarContestResult {
  const withTime = cars.map((car, rosterIndex) => ({
    ...car,
    rosterIndex,
    time: car.lapTimes.reduce((sum, lapTime) => sum + lapTime, 0),
  }));
  const ranked = [...withTime].sort((a, b) => a.time - b.time || a.rosterIndex - b.rosterIndex);
  const leaderTime = ranked[0].time;
  const resultCars: CarResult[] = ranked.map((car, index) => ({
    id: car.id,
    role: car.role,
    name: car.name,
    color: car.color,
    time: car.time,
    laps: car.lapTimes.map((time) => ({ time, firedItems: [], contributions: [] })),
    position: index + 1,
    gapToLeader: car.time - leaderTime,
  }));
  const player = resultCars.find((car) => car.role === "player")!;
  const outcome: ContestOutcome = player.position === 1
    ? "win"
    : player.time === leaderTime ? "tie" : "loss";

  return {
    lapCount: cars[0]?.lapTimes.length ?? 0,
    cars: resultCars,
    outcome,
    board: [],
    storage: [],
    track,
    tieBreakOrder: cars.map((car) => car.id),
  };
}

/** Every rival's lap times equal the player's — exercises pure roster tie order at every checkpoint. */
export function equalTimeFixture(lapCount = 10, lapTime = 5): NCarContestResult {
  const cars: FixtureCar[] = [
    { id: "player", role: "player", name: "Player", color: "#ffd447", lapTimes: Array(lapCount).fill(lapTime) },
    ...RIVAL_PROFILES.map((profile) => ({
      id: profile.id, role: "rival" as const, name: profile.name, color: profile.color,
      lapTimes: Array(lapCount).fill(lapTime),
    })),
  ];
  return ncarResult(cars);
}

/**
 * Rivals oscillate around the player's pace within each lap (fast first
 * half, slow second half of a lap-pair) so interpolated mid-lap order
 * changes constantly, while every car's per-lap total stays close enough
 * that checkpoint order is stable across most laps — exercises "frequent
 * frame-level reordering, stable lap splits" (spec.md Independent Test, US1).
 */
export function volatileFrameOrderFixture(lapCount = 10): NCarContestResult {
  const playerLaps = Array.from({ length: lapCount }, () => 5);
  const cars: FixtureCar[] = [
    { id: "player", role: "player", name: "Player", color: "#ffd447", lapTimes: playerLaps },
    ...RIVAL_PROFILES.map((profile, rivalIndex) => ({
      id: profile.id, role: "rival" as const, name: profile.name, color: profile.color,
      lapTimes: Array.from({ length: lapCount }, (_unused, lapIndex) =>
        5 + (0.4 * Math.sin((lapIndex + rivalIndex) * 1.7))),
    })),
  ];
  return ncarResult(cars);
}

/**
 * The player leads "rival-alternate" through checkpoint 1 (cumulative 3 vs
 * 5), then trails from checkpoint 2 onward (13 vs 9, then held at +4 every
 * lap after) — a genuine single rank flip between two specific checkpoints,
 * stable before and after it (verified: mirrored alternating sequences
 * never actually cross sign, only this kind of asymmetric one does).
 */
export function changingCheckpointOrderFixture(lapCount = 6): NCarContestResult {
  const playerPattern = [3, 10, 5, 5, 5, 5];
  const rivalPattern = [5, 4, 5, 5, 5, 5];
  const extend = (pattern: number[]) => Array.from({ length: lapCount }, (_unused, i) => pattern[i] ?? pattern[pattern.length - 1]);
  const cars: FixtureCar[] = [
    { id: "player", role: "player", name: "Player", color: "#ffd447", lapTimes: extend(playerPattern) },
    { id: "rival-alternate", role: "rival", name: "Alternator", color: "#7cc", lapTimes: extend(rivalPattern) },
    ...RIVAL_PROFILES.slice(1).map((profile) => ({
      id: profile.id, role: "rival" as const, name: profile.name, color: profile.color,
      lapTimes: Array(lapCount).fill(50),
    })),
  ];
  return ncarResult(cars);
}

/** Ghosts finish (fewer/faster laps) well before the player crosses the line. */
export function staggeredFinishFixture(lapCount = 8): NCarContestResult {
  const cars: FixtureCar[] = [
    { id: "player", role: "player", name: "Player", color: "#ffd447", lapTimes: Array(lapCount).fill(8) },
    ...RIVAL_PROFILES.map((profile, index) => ({
      id: profile.id, role: "rival" as const, name: profile.name, color: profile.color,
      lapTimes: Array(lapCount).fill(3 + index * 0.3),
    })),
  ];
  return ncarResult(cars);
}
