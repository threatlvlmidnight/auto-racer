import { simulatePlayerLaps } from "./laps";
import type { Build } from "./types";

/**
 * Resulting finishing time for a Build: baseline time plus every held item
 * modifier (data-model.md).
 *
 * Pure function — no mutation, no I/O, no randomness (simulation-contract.md
 * Invariant 4).
 */
export function resultingTime(build: Build): number {
  const total = simulatePlayerLaps(build).reduce((sum, lap) => sum + lap.time, 0);

  // Defensive guard (Polish, T020): malformed content data (NaN/Infinity)
  // should fail loudly during development rather than silently produce an
  // unexplainable result at the ResultScene.
  if (!Number.isFinite(total)) {
    throw new Error(
      `resultingTime produced a non-finite value (car.baseLapTime=${build.car.baseLapTime})`
    );
  }

  return total;
}
