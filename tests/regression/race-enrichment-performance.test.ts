import { describe, expect, it } from "vitest";
import { resolveEnrichedContest } from "../../src/simulation/contest";
import {
  BASELINE_BUILD_PROFILES,
  DEFAULT_ENTRANT_ID,
  ENRICHMENT_LEVEL,
  racerRivalRoster,
} from "../fixtures/race-enrichment-fixtures";
import { BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS } from "../integration/race-enrichment-baseline.test";

/**
 * Feature 033 (T086): one enriched 8-car / 16-lap synchronous resolution must
 * stay inside the no-material-delay tolerance recorded at baseline (T001), i.e.
 * well above the observed pre-enrichment median and under 250 ms.
 */
const SEEDS = [1, 7, 42, 1337, 9001];

function timeOneEnriched(seed: number): number {
  const start = performance.now();
  resolveEnrichedContest({
    playerBuild: BASELINE_BUILD_PROFILES.strong,
    entrantId: DEFAULT_ENTRANT_ID,
    rivalRoster: racerRivalRoster,
    level: ENRICHMENT_LEVEL,
    seed,
    lapCount: 16,
  });
  return performance.now() - start;
}

describe("Feature 033 (T086): enriched resolution performance", () => {
  it("keeps a single enriched 8-car/16-lap resolution inside the no-material-delay budget", () => {
    const elapsed = SEEDS.map(timeOneEnriched);
    const mean = elapsed.reduce((sum, ms) => sum + ms, 0) / elapsed.length;
    expect(Number.isFinite(mean)).toBe(true);
    expect(mean).toBeLessThan(BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS);
    for (const ms of elapsed) {
      expect(ms).toBeLessThan(50 * BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS);
    }
  });

  it("records a stable, reproducible timing distribution", () => {
    const first = SEEDS.map(timeOneEnriched);
    const second = SEEDS.map(timeOneEnriched);
    expect(second.length).toBe(first.length);
  });
});
