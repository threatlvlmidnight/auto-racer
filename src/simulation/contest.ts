import { simulatePlayerLaps } from "./laps";
import { resolveRivalBuild } from "./rivals";
import { installedItems, storedItems } from "./slots";
import {
  LAP_COUNT,
  type Build,
  type CarResult,
  type ContestOutcome,
  type ContestResult,
  type NCarContestResult,
  type RivalProfile,
  type SampleGhost,
} from "./types";

export function ghostLapTimes(ghost: SampleGhost, lapCount = LAP_COUNT): number[] {
  return Array(lapCount).fill(ghost.lapTime);
}

export type ContestResolutionErrorCode = "invalid-roster-size";

/** Typed, inspectable failure for a malformed rival roster (data-model.md Validation Invariant 5). */
export class ContestResolutionError extends Error {
  constructor(
    public readonly code: ContestResolutionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ContestResolutionError";
  }
}

const PLAYER_COLOR = "#ffd447";
const REQUIRED_RIVAL_COUNT = 7;

/**
 * Resolve a 1v1 contest between a Build and a SampleGhost (FR-004,
 * 011-build-test-day's Test Day/Practice path — unchanged by 012, per its
 * research.md Decision 6 and FR-011).
 *
 * contracts/simulation-contract.md invariants:
 *  1. Determinism — pure function of (build, ghost); no randomness, no I/O.
 *  2. Outcome correctness — win iff playerTime < ghostTime, loss iff greater,
 *     tie iff equal (FR-011: a tie is recorded as "tie" here; the
 *     both-sides-win framing is a presentation-layer concern, not this
 *     function's).
 *  3. Detectable effect — active item modifiers change playerTime (see build.ts).
 *  4. Order-independence — only the active item set matters.
 *  5. No side effects — build and ghost are only read, never mutated.
 */
export function resolveContest(build: Build, ghost: SampleGhost, lapCount?: number): ContestResult;
/**
 * Resolve a scored N-car contest between the player and exactly 7 rival
 * profiles (012-multi-ghost-contest, contract §3). Pure and deterministic:
 * identical (playerBuild, rivalRoster, level, seed, lapCount) always
 * produces a deeply equal result. Every rival counts toward standings — no
 * decorative car (FR-003). Ties resolve by fixed roster order: player,
 * then rivals in authored catalog order (FR-007).
 */
export function resolveContest(
  playerBuild: Build,
  rivalRoster: readonly RivalProfile[],
  level: number,
  seed: number,
  lapCount?: number,
): NCarContestResult;
export function resolveContest(
  build: Build,
  second: SampleGhost | readonly RivalProfile[],
  third?: number,
  fourth?: number,
  fifth?: number,
): ContestResult | NCarContestResult {
  if (Array.isArray(second)) {
    return resolveNCarContest(build, second, third ?? 1, fourth ?? 0, fifth ?? LAP_COUNT);
  }
  return resolveLegacyContest(build, second as SampleGhost, third ?? LAP_COUNT);
}

function resolveLegacyContest(build: Build, ghost: SampleGhost, lapCount: number): ContestResult {
  const ghostLaps = ghostLapTimes(ghost, lapCount);
  const laps = simulatePlayerLaps(build, lapCount).map((playerLap, index) => ({
    lap: index + 1,
    playerLapTime: playerLap.time,
    ghostLapTime: ghostLaps[index],
    firedItems: playerLap.firedItems,
    contributions: playerLap.contributions,
  }));
  const playerTime = laps.reduce((sum, lap) => sum + lap.playerLapTime, 0);
  const ghostTime = laps.reduce((sum, lap) => sum + lap.ghostLapTime, 0);
  const gap = playerTime - ghostTime;

  const outcome: ContestOutcome = gap < 0 ? "win" : gap > 0 ? "loss" : "tie";

  return {
    lapCount,
    playerTime,
    ghostTime,
    gap,
    outcome,
    board: installedItems(build).filter((item): item is NonNullable<typeof item> => item !== null),
    storage: storedItems(build).filter((item): item is NonNullable<typeof item> => item !== null),
    laps,
    contributions: laps.flatMap((lap) => lap.contributions),
  };
}

function resolveNCarContest(
  playerBuild: Build,
  rivalRoster: readonly RivalProfile[],
  level: number,
  seed: number,
  lapCount: number,
): NCarContestResult {
  if (rivalRoster.length !== REQUIRED_RIVAL_COUNT) {
    throw new ContestResolutionError(
      "invalid-roster-size",
      `Expected exactly ${REQUIRED_RIVAL_COUNT} rivals, got ${rivalRoster.length}`,
    );
  }

  const playerLaps = simulatePlayerLaps(playerBuild, lapCount);
  const rosterOrder: Omit<CarResult, "position" | "gapToLeader">[] = [
    {
      id: "player",
      role: "player",
      name: "Player",
      color: PLAYER_COLOR,
      time: playerLaps.reduce((sum, lap) => sum + lap.time, 0),
      laps: playerLaps,
    },
    ...rivalRoster.map((profile) => {
      const rivalLaps = simulatePlayerLaps(resolveRivalBuild(profile, level, seed), lapCount);
      return {
        id: profile.id,
        role: "rival" as const,
        name: profile.name,
        color: profile.color,
        time: rivalLaps.reduce((sum, lap) => sum + lap.time, 0),
        laps: rivalLaps,
      };
    }),
  ];

  // Tie-break: fixed roster order (player first, then rivals in catalog
  // order) — never randomized, never left ambiguous (FR-007).
  const ranked = rosterOrder
    .map((entry, rosterIndex) => ({ entry, rosterIndex }))
    .sort((a, b) => a.entry.time - b.entry.time || a.rosterIndex - b.rosterIndex)
    .map(({ entry }) => entry);

  const leaderTime = ranked[0].time;
  const cars: CarResult[] = ranked.map((entry, index) => ({
    ...entry,
    position: index + 1,
    gapToLeader: entry.time - leaderTime,
  }));

  const player = cars.find((car) => car.role === "player")!;
  const outcome: ContestOutcome = player.position === 1
    ? "win"
    : player.time === leaderTime ? "tie" : "loss";

  return {
    lapCount,
    cars,
    outcome,
    board: installedItems(playerBuild).filter((item): item is NonNullable<typeof item> => item !== null),
    storage: storedItems(playerBuild).filter((item): item is NonNullable<typeof item> => item !== null),
  };
}
