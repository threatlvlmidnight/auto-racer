import { describe, expect, it } from "vitest";
import {
  ENRICHMENT_SEED_STREAMS,
  activeSeedStreams,
  computePhaseSchedule,
  deriveNamedSubSeed,
  racePhaseForLap,
} from "../../src/simulation/raceEnrichment";
import { ENRICHMENT_LAP_COUNTS } from "../fixtures/race-enrichment-fixtures";

/**
 * Feature 033 Phase 2 (T008/T009): exact phase-coverage and isolated named
 * sub-seed derivation. Phase counts are pinned end-to-end (8=`2/4/2`,
 * 10=`2/5/3`, 12=`3/6/3`, 14=`3/7/4`, 16=`4/8/4`) with an indivisible remainder
 * belonging to Final Push (spec.md clarification; data-model.md RacePhase).
 */

describe("Feature 033 (T008): exact phase coverage for every supported lap count", () => {
  const expectedCounts: Record<number, { opening: number; contest: number; finalPush: number }> = {
    8: { opening: 2, contest: 4, finalPush: 2 },
    10: { opening: 2, contest: 5, finalPush: 3 },
    12: { opening: 3, contest: 6, finalPush: 3 },
    14: { opening: 3, contest: 7, finalPush: 4 },
    16: { opening: 4, contest: 8, finalPush: 4 },
  };

  it.each(ENRICHMENT_LAP_COUNTS)("assigns lap count %d to exact 25/50/25 counts", (lapCount) => {
    const schedule = computePhaseSchedule(lapCount);
    expect(schedule.counts).toEqual(expectedCounts[lapCount]);
  });

  it("assigns every lap to exactly one phase, contiguously from 1 to lapCount", () => {
    for (const lapCount of ENRICHMENT_LAP_COUNTS) {
      const schedule = computePhaseSchedule(lapCount);
      const total = schedule.counts.opening + schedule.counts.contest + schedule.counts.finalPush;
      expect(total).toBe(lapCount);
      expect(schedule.opening.start).toBe(1);
      expect(schedule.finalPush.end).toBe(lapCount);
      expect(racePhaseForLap(schedule, 1)).toBe("opening");
      expect(racePhaseForLap(schedule, lapCount)).toBe("final-push");

      const seen = new Set<string>();
      for (let lap = 1; lap <= lapCount; lap += 1) {
        seen.add(racePhaseForLap(schedule, lap));
      }
      expect(seen.has("opening")).toBe(true);
      expect(seen.has("contest")).toBe(true);
      expect(seen.has("final-push")).toBe(true);
    }
  });

  it("exact phase member checks for the longest supported race (16 = 4/8/4)", () => {
    const schedule = computePhaseSchedule(16);
    expect(racePhaseForLap(schedule, 1)).toBe("opening");
    expect(racePhaseForLap(schedule, 4)).toBe("opening");
    expect(racePhaseForLap(schedule, 5)).toBe("contest");
    expect(racePhaseForLap(schedule, 12)).toBe("contest");
    expect(racePhaseForLap(schedule, 13)).toBe("final-push");
    expect(racePhaseForLap(schedule, 16)).toBe("final-push");
  });

  it("handles a single-lap race deterministically (valid, non-crashing)", () => {
    const schedule = computePhaseSchedule(1);
    expect(schedule.lapCount).toBe(1);
    expect(schedule.counts.opening + schedule.counts.contest + schedule.counts.finalPush).toBe(1);
    expect(schedule.opening.start + schedule.opening.end + schedule.contest.start + schedule.contest.end + schedule.finalPush.start + schedule.finalPush.end).toBeGreaterThan(0);
    const closedPhases = ["opening", "contest", "final-push"];
    expect(closedPhases).toContain(racePhaseForLap(schedule, 1));
  });

  it("rejects non-positive or non-integer lap counts", () => {
    expect(() => computePhaseSchedule(0)).toThrow();
    expect(() => computePhaseSchedule(-3)).toThrow();
    expect(() => computePhaseSchedule(7.5)).toThrow();
  });
});

describe("Feature 033 (T009): named sub-seed stability and incident isolation", () => {
  it("derives a deterministic named sub-seed that is stable across calls", () => {
    const first = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.incidents);
    const second = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.incidents);
    expect(first).toBe(second);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
  });

  it("produces distinct sub-seeds for distinct stream names and distinct main seeds", () => {
    const incidents = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.incidents);
    const actionTies = deriveNamedSubSeed(42, ENRICHMENT_SEED_STREAMS.actionTies);
    expect(incidents).not.toBe(actionTies);

    const other = deriveNamedSubSeed(1337, ENRICHMENT_SEED_STREAMS.incidents);
    expect(other).not.toBe(incidents);
  });

  it("toggle isolation: enabling/disabling incidents changes only the incidents stream", () => {
    const base = activeSeedStreams(true, false);
    const withIncidents = activeSeedStreams(true, true);
    expect(base).not.toContain(ENRICHMENT_SEED_STREAMS.incidents);
    expect(withIncidents).toContain(ENRICHMENT_SEED_STREAMS.incidents);

    const baseWithoutIncidents = withIncidents.filter((s) => s !== ENRICHMENT_SEED_STREAMS.incidents);
    expect(baseWithoutIncidents).toEqual(base);

    expect(base).toEqual([ENRICHMENT_SEED_STREAMS.opponentSetup, ENRICHMENT_SEED_STREAMS.actionTies]);
  });

  it("a disabled enrichment master switch activates no streams at all", () => {
    expect(activeSeedStreams(false, true)).toEqual([]);
    expect(activeSeedStreams(false, false)).toEqual([]);
  });
});