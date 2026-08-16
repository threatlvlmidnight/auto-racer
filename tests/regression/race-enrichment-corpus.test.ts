import { describe, expect, it } from "vitest";
import { resolveContest, resolveEnrichedContest } from "../../src/simulation/contest";
import { DEFAULT_RACE_ENRICHMENT_CONFIG } from "../../src/simulation/enrichmentConfig";
import {
  BASELINE_BUILD_PROFILES,
  DEFAULT_ENTRANT_ID,
  ENRICHMENT_LEVEL,
  racerRivalRoster,
  type BaselineBuildProfile,
} from "../fixtures/race-enrichment-fixtures";

/**
 * Feature 033 US1 (T021) — regression corpus over the enriched resolver.
 *
 * Pins two US1 acceptance facts that the tuning gates (T085) will later refine:
 *  1. Separated-build preservation: a clearly stronger legal build finishes
 *     ahead of a clearly weaker one under identical rivals/field (acceptance
 *     scenario 5) and is never routinely upset.
 *  2. Enrichment stays bounded: enriched resolution must not casually reverse
 *     the deterministic winner — winner-change rate is finite, non-negative,
 *     and materially below "chaotic" (full-band tuning is T085).
 */
const SEEDS = [1, 7, 42, 1337, 9001];
const LAP_COUNTS = [8, 12, 16];
const PROFILES: BaselineBuildProfile[] = ["empty", "strong", "weak"];

function runEnriched(profile: BaselineBuildProfile, seed: number, lapCount: number) {
  return resolveEnrichedContest({
    playerBuild: BASELINE_BUILD_PROFILES[profile],
    entrantId: DEFAULT_ENTRANT_ID,
    rivalRoster: racerRivalRoster,
    level: ENRICHMENT_LEVEL,
    seed,
    lapCount,
  });
}

describe("Feature 033 (T021): separated-build preservation", () => {
  it("keeps the clearly stronger build ahead of the clearly weaker one under identical rivals", () => {
    for (const seed of SEEDS) {
      const strong = runEnriched("strong", seed, 16).cars.find((car) => car.role === "player")!;
      const weak = runEnriched("weak", seed, 16).cars.find((car) => car.role === "player")!;
      expect(strong.time).toBeLessThan(weak.time);
    }
  });

  it("does not routinely let the weaker build beat the stronger one", () => {
    let strongWins = 0;
    let weakWins = 0;
    for (const seed of SEEDS) {
      if (runEnriched("strong", seed, 16).cars[0].role === "player") strongWins += 1;
      if (runEnriched("weak", seed, 16).cars[0].role === "player") weakWins += 1;
    }
    expect(strongWins).toBeGreaterThanOrEqual(weakWins);
  });
});

describe("Feature 033 (T021): bounded enrichment (configurable winner-change)", () => {
  it("reports a finite, non-degenerate winner-change rate against the baseline resolver", () => {
    let compare = 0;
    let changed = 0;
    for (const seed of SEEDS) {
      for (const lapCount of LAP_COUNTS) {
        for (const profile of PROFILES) {
          const baselineWinner = resolveContest(
            BASELINE_BUILD_PROFILES[profile],
            racerRivalRoster,
            ENRICHMENT_LEVEL,
            seed,
            lapCount,
          ).cars[0].id;
          const enrichedWinner = runEnriched(profile, seed, lapCount).cars[0].id;
          compare += 1;
          if (enrichedWinner !== baselineWinner) changed += 1;
        }
      }
    }
    const rate = changed / compare;
    // Finite and bounded: enrichment must not routinely reverse the winner.
    expect(Number.isFinite(rate)).toBe(true);
    expect(compare).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(0.5);
    expect(rate).toBeGreaterThanOrEqual(0);
  });

  it("meets the centralized post-Opening, emphasis, and winner-change bands", () => {
    const profiles = Object.keys(BASELINE_BUILD_PROFILES) as BaselineBuildProfile[];
    let races = 0;
    let postOpening = 0;
    let fullEmphasis = 0;
    let winnerChanges = 0;
    for (const seed of SEEDS) {
      for (const lapCount of [8, 10, 12, 14, 16]) {
        for (const profile of profiles) {
          const baseline = resolveContest(BASELINE_BUILD_PROFILES[profile], racerRivalRoster, ENRICHMENT_LEVEL, seed, lapCount);
          const enriched = runEnriched(profile, seed, lapCount);
          races += 1;
          if (enriched.cars[0].id !== baseline.cars[0].id) winnerChanges += 1;
          if (enriched.events.some((event) => event.phase !== "opening" && event.kind !== "phase-transition")) postOpening += 1;
          if (enriched.events.some((event) => event.emphasis === "full")) fullEmphasis += 1;
        }
      }
    }
    const bands = DEFAULT_RACE_ENRICHMENT_CONFIG.corpusBands;
    expect(postOpening / races).toBeGreaterThanOrEqual(bands.postOpeningEventRateMin);
    expect(fullEmphasis / races).toBeLessThanOrEqual(bands.emphasisRateMax);
    expect(winnerChanges / races).toBeGreaterThanOrEqual(bands.winnerChangeRateMin);
    expect(winnerChanges / races).toBeLessThanOrEqual(bands.winnerChangeRateMax);
  });

  it("exposes configurable winner-change/resource bands on the accepted config", () => {
    const bands = DEFAULT_RACE_ENRICHMENT_CONFIG.corpusBands;
    expect(bands.postOpeningEventRateMin).toBeGreaterThanOrEqual(0);
    expect(bands.winnerChangeRateMax).toBeGreaterThanOrEqual(bands.winnerChangeRateMin);
    // The enabled resolver carries exactly the config it was resolved with.
    const result = runEnriched("empty", 1, 8);
    expect(result.configVersion).toBe(DEFAULT_RACE_ENRICHMENT_CONFIG.version);
    expect(result.incidentsEnabled).toBe(true);
  });
});
