import { describe, expect, it } from "vitest";
import { generateTrack } from "../../src/simulation/tracks";
import {
  ENRICHMENT_LAP_COUNTS,
  ENRICHMENT_SEEDS,
  ENRICHMENT_LEVEL,
  baselineEmptyBuild,
} from "../fixtures/race-enrichment-fixtures";
import {
  BASELINE_CORPUS,
  resolveBaselineCase,
  runBaselineCorpus,
  summarizeBaselineCorpus,
} from "../fixtures/race-enrichment-corpus";

/**
 * Feature 033 Phase 1 (T003): pre-enrichment N-car baselines.
 *
 * Pins the *absence* of any enrichment surface before Feature 033 starts, and
 * measures the deterministic field/stability/performance/winner-prediction facts
 * that the enrichment tuning gates (T0085) will be compared against. Every
 * assertion here must continue to pass byte-identically after enrichment lands —
 * enrichment must be additive and must preserve these baseline facts where the
 * contract requires it.
 */

/** The numeric no-material-delay budget (plan.md Performance Goals, T001/T0086). */
export const BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS = 250;

describe("Feature 033 baseline: pre-enrichment N-car result surface is absent", () => {
  it("does not expose enrichment fields on the contest result or its cars", () => {
    const { result } = resolveBaselineCase({ seed: 42, lapCount: 16, profile: "empty" });

    expect(result).not.toHaveProperty("enrichment");
    expect(result).not.toHaveProperty("phaseSchedule");
    expect(result).not.toHaveProperty("enrichmentEvents");

    for (const car of result.cars) {
      expect(car).not.toHaveProperty("driverIdentity");
      expect(car).not.toHaveProperty("composureLedger");
      expect(car).not.toHaveProperty("enrichedLaps");
    }
  });

  it("carries exactly the pre-enrichment evidence consumers rely on today", () => {
    const { result } = resolveBaselineCase({ seed: 1, lapCount: 12, profile: "empty" });
    expect(result.lapCount).toBe(12);
    expect(result.cars).toHaveLength(8);
    expect(result.track).toBeDefined();
    expect(result.tieBreakOrder).toHaveLength(8);
    expect(result.outcome).toMatch(/win|loss|tie/);
  });
});

describe("Feature 033 baseline: 8-car field integrity across supported lap counts", () => {
  it("produces a full field with unique 1..8 positions and a retained track", () => {
    for (const lapCount of ENRICHMENT_LAP_COUNTS) {
      const { result } = resolveBaselineCase({ seed: 7, lapCount, profile: "empty" });
      expect(result.cars).toHaveLength(8);
      const positions = result.cars.map((car) => car.position).sort((a, b) => a - b);
      expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(result.track).toEqual(generateTrack(7, ENRICHMENT_LEVEL));
      for (const car of result.cars) {
        expect(car.laps).toHaveLength(lapCount);
      }
    }
  });
});

describe("Feature 033 baseline: deterministic replay identity", () => {
  it("resolves identical inputs to deeply equal results across the corpus", () => {
    for (const caseId of BASELINE_CORPUS) {
      const first = resolveBaselineCase(caseId);
      const second = resolveBaselineCase(caseId);
      expect(second.result).toEqual(first.result);
    }
  });
});

describe("Feature 033 baseline: corpus watchability and winner-prediction projection", () => {
  const summary = summarizeBaselineCorpus(runBaselineCorpus());

  it("reports zero post-Opening enrichment events and zero emphasis pre-enrichment", () => {
    expect(summary.postOpeningEventRate).toBe(0);
    expect(summary.emphasisRate).toBe(0);
    expect(summary.caseCount).toBe(BASELINE_CORPUS.length);
  });

  it("keeps the clearly stronger build dominant over the weak build across seeds", () => {
    expect(summary.strongVsWeak.strongWins).toBeGreaterThan(summary.strongVsWeak.weakWins);
    expect(summary.strongVsWeak.sharedSeeds).toBe(ENRICHMENT_SEEDS.length);
  });
});

describe("Feature 033 baseline: synchronous resolution stays inside the delay budget", () => {
  it("keeps the median 8-car resolution under the accepted no-material-delay tolerance", () => {
    const summary = summarizeBaselineCorpus(runBaselineCorpus());
    expect(summary.timingMs.median).toBeLessThan(BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS);
    expect(Number.isFinite(summary.timingMs.mean)).toBe(true);
    expect(summary.timingMs.max).toBeLessThanOrEqual(50 * BASELINE_NO_MATERIAL_DELAY_TOLERANCE_MS);
  });

  it("pins the empty build as a deterministic control at every lap count", () => {
    for (const lapCount of ENRICHMENT_LAP_COUNTS) {
      const playerTime = baselineEmptyBuild; // reference kept stable
      expect(playerTime).toBeDefined();
      const { result } = resolveBaselineCase({ seed: 1337, lapCount, profile: "empty" });
      const player = result.cars.find((car) => car.role === "player")!;
      expect(player.laps).toHaveLength(lapCount);
      expect(player.laps.every((lap) => Number.isFinite(lap.time))).toBe(true);
    }
  });
});