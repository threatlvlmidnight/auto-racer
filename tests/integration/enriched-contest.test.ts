import { describe, expect, it } from "vitest";
import { resolveEnrichedContest } from "../../src/simulation/contest";
import {
  BASELINE_BUILD_PROFILES,
  DEFAULT_ENTRANT_ID,
  ENRICHMENT_ENTRANTS,
  ENRICHMENT_LAP_COUNTS,
  ENRICHMENT_LEVEL,
  ENRICHMENT_SEEDS,
  racerRivalRoster,
  type BaselineBuildProfile,
} from "../fixtures/race-enrichment-fixtures";

/**
 * Feature 033 US1 (T020): the enriched N-car resolver is deterministic (identical
 * inputs resolve to deeply equal enriched results), asynchronous replay identical,
 * and every consequential event + enriched lap is retained — with no playback-side
 * RNG or scene authority. Framework-free; contract §2/§8/§9.
 */

function resolve(seed: number, lapCount: number, profile: BaselineBuildProfile, entrantId = DEFAULT_ENTRANT_ID) {
  return resolveEnrichedContest({
    playerBuild: BASELINE_BUILD_PROFILES[profile],
    entrantId,
    rivalRoster: racerRivalRoster,
    level: ENRICHMENT_LEVEL,
    seed,
    lapCount,
  });
}

describe("Feature 033 (T020): enriched resolution repeat identity", () => {
  it("resolves identical inputs to deeply equal enriched results", () => {
    for (const seed of ENRICHMENT_SEEDS) {
      for (const lapCount of ENRICHMENT_LAP_COUNTS) {
        const first = resolve(seed, lapCount, "empty");
        const second = resolve(seed, lapCount, "empty");
        expect(second).toEqual(first);
      }
    }
  });

  it("retains a full field with unique 1..8 positions and consistent ranking", () => {
    const result = resolve(42, 16, "weak");
    expect(result.cars).toHaveLength(8);
    const positions = result.cars.map((car) => car.position).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const seen = new Set(result.cars.map((car) => car.id));
    expect(seen.size).toBe(8);
  });

  it("carries retained enrichment evidence on every car and the result", () => {
    const result = resolve(7, 12, "strong");
    expect(result.configVersion).toBeDefined();
    expect(result.phaseSchedule.lapCount).toBe(12);
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.incidentsEnabled).toBe(true);
    for (const car of result.cars) {
      expect(car.driverIdentity).toBeDefined();
      expect(car.composureLedger).toBeDefined();
      expect(car.enrichedLaps).toHaveLength(12);
      // Authored base time is preserved on every enriched lap.
      for (const lap of car.enrichedLaps) {
        expect(lap.baseTime).toBeGreaterThan(0);
        expect(Number.isFinite(lap.enrichedTime)).toBe(true);
      }
    }
    // Eligibility is resolved for every participant (origin-agnostic).
    expect(result.eligibility).toHaveLength(8);
  });

  it("keeps the authoritative base lap evidence beside the enriched projection", () => {
    const result = resolve(1337, 10, "weak");
    for (const car of result.cars) {
      expect(car.laps).toHaveLength(10);
      expect(car.enrichedLaps).toHaveLength(10);
      // Enriched total drives the retained `time` ranking.
      const enrichedTotal = car.enrichedLaps.reduce((sum, lap) => sum + lap.enrichedTime, 0);
      expect(car.time).toBeCloseTo(enrichedTotal, 9);
    }
  });

  it("is replay-identical across every supported entrant identity", () => {
    for (const entrantId of ENRICHMENT_ENTRANTS) {
      const once = resolve(1, 8, "native-corner", entrantId);
      const twice = resolve(1, 8, "native-corner", entrantId);
      expect(twice).toEqual(once);
    }
  });

  it("emits no live randomness: event identity/order is byte-stable across re-resolution", () => {
    const first = resolve(9001, 14, "mixed-corner");
    const second = resolve(9001, 14, "mixed-corner");
    expect(second.events.map((event) => event.eventId)).toEqual(first.events.map((event) => event.eventId));
    expect(second.events.map((event) => event.kind)).toEqual(first.events.map((event) => event.kind));
  });
});
