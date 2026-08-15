import { resolveContest } from "../../src/simulation/contest";
import type { NCarContestResult } from "../../src/simulation/types";
import {
  BASELINE_BUILD_PROFILES,
  ENRICHMENT_LAP_COUNTS,
  ENRICHMENT_SEEDS,
  ENRICHMENT_LEVEL,
  racerRivalRoster,
  type BaselineBuildProfile,
} from "./race-enrichment-fixtures";

/**
 * Feature 033 Phase 1 (T004): representative deterministic baseline corpus runner
 * and metrics projector. Resolves the pre-enrichment N-car contest over seeds × lap
 * counts × build profiles, measures synchronous resolution timing, and projects the
 * watchability/winner-prediction metrics Feature 033's tuning gates will be measured
 * against (spec.md "watchability target"; T0085). Everything here is framework-free
 * and deterministic; the baseline test and the acceptance-evidence record both
 * consume the same runner.
 *
 * Pre-enrichment invariant this runner pins for T005/T085: there are no enrichment
 * events at all, so post-Opening-event/emphasis rates are zero by construction.
 */

export interface BaselineCaseId {
  seed: number;
  lapCount: number;
  profile: BaselineBuildProfile;
}

export interface ResolvedBaselineCase extends BaselineCaseId {
  result: NCarContestResult;
  /** Milliseconds for one 8-car synchronous resolution. */
  elapsedMs: number;
}

export interface BaselineCorpusSummary {
  caseCount: number;
  resolutionCount: number;
  playerWinCountByProfile: Partial<Record<BaselineBuildProfile, number>>;
  /** Whether the clearly stronger build (strong) beat the weak build over shared seeds. */
  strongVsWeak: { strongWins: number; weakWins: number; sharedSeeds: number };
  /** Fraction of resolutions where the lap-1 leader was also the finisher leader. */
  leaderRetainedFromOpeningRate: number;
  /** Pre-enrichment: always 0 — no enrichment events exist yet. */
  postOpeningEventRate: number;
  /** Pre-enrichment: always 0 — no emphasis presentation exists yet. */
  emphasisRate: number;
  timingMs: { min: number; max: number; mean: number; median: number };
}

export const BASELINE_CORPUS: readonly BaselineCaseId[] = ENRICHMENT_SEEDS.flatMap((seed) =>
  ENRICHMENT_LAP_COUNTS.flatMap((lapCount) =>
    (Object.keys(BASELINE_BUILD_PROFILES) as BaselineBuildProfile[]).map((profile) => ({
      seed,
      lapCount,
      profile,
    })),
  ),
);

/** Resolve one deterministic 8-car contest and its synchronous timing. */
export function resolveBaselineCase(caseId: BaselineCaseId): ResolvedBaselineCase {
  const start = performance.now();
  const result = resolveContest(
    BASELINE_BUILD_PROFILES[caseId.profile],
    racerRivalRoster,
    ENRICHMENT_LEVEL,
    caseId.seed,
    caseId.lapCount,
  );
  const elapsedMs = performance.now() - start;
  return { ...caseId, result, elapsedMs };
}

/** Leader at lap 1, derived from cumulative per-lap times. */
function leaderIdAfterFirstLap(result: NCarContestResult): string | undefined {
  const first = result.cars
    .slice()
    .sort((a, b) => a.laps[0].time - b.laps[0].time || leaderTie(a.time, b.time));
  return first[0]?.id;
}

function leaderTie(a: number, b: number): number {
  return a - b;
}

/** Resolve the full baseline corpus once. */
export function runBaselineCorpus(): readonly ResolvedBaselineCase[] {
  return BASELINE_CORPUS.map(resolveBaselineCase);
}

/** Aggregate the watchability/winner-prediction/performance metrics. */
export function summarizeBaselineCorpus(cases: readonly ResolvedBaselineCase[]): BaselineCorpusSummary {
  const timings = cases.map((c) => c.elapsedMs).sort((a, b) => a - b);
  const mean = timings.reduce((s, t) => s + t, 0) / Math.max(1, timings.length);
  const median = timings[Math.floor(timings.length / 2)] ?? 0;

  const playerWinCountByProfile: Partial<Record<BaselineBuildProfile, number>> = {};
  const strongVsWeak = { strongWins: 0, weakWins: 0, sharedSeeds: ENRICHMENT_SEEDS.length };
  let retainedFromOpening = 0;
  let retainedDenominator = 0;

  for (const c of cases) {
    const player = c.result.cars.find((car) => car.role === "player")!;
    playerWinCountByProfile[c.profile] = (playerWinCountByProfile[c.profile] ?? 0) + (player.position === 1 ? 1 : 0);

    if (c.profile === "strong") {
      const leaderFirstLap = leaderIdAfterFirstLap(c.result);
      const leaderFinish = c.result.cars[0].id;
      if (leaderFirstLap !== undefined) {
        retainedDenominator += 1;
        retainedFromOpening += leaderFirstLap === leaderFinish ? 1 : 0;
      }
      if (player.position === 1) strongVsWeak.strongWins += 1;
    }
    if (c.profile === "weak" && player.position === 1) strongVsWeak.weakWins += 1;
  }

  return {
    caseCount: cases.length,
    resolutionCount: cases.length,
    playerWinCountByProfile,
    strongVsWeak,
    leaderRetainedFromOpeningRate: retainedDenominator > 0 ? retainedFromOpening / retainedDenominator : 0,
    postOpeningEventRate: 0,
    emphasisRate: 0,
    timingMs: { min: timings[0] ?? 0, max: timings[timings.length - 1] ?? 0, mean, median },
  };
}