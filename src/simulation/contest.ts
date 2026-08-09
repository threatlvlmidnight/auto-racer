import { simulatePlayerLaps } from "./laps";
import { installedItems, storedItems } from "./slots";
import {
  LAP_COUNT,
  type Build,
  type ContestOutcome,
  type ContestResult,
  type SampleGhost,
} from "./types";

export function ghostLapTimes(ghost: SampleGhost, lapCount = LAP_COUNT): number[] {
  return Array(lapCount).fill(ghost.lapTime);
}

/**
 * Resolve a 1v1 contest between a Build and a SampleGhost (FR-004).
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
export function resolveContest(
  build: Build,
  ghost: SampleGhost,
  lapCount = LAP_COUNT,
): ContestResult {
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
