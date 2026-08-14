import { describe, expect, it } from "vitest";
import { SAMPLE_GHOST } from "../../src/content/sample-data";
import {
  TEST_DAY_CONFIG,
  clearPracticeComparisonHistory,
  comparePracticeResults,
  createPracticeReturnContext,
  createPracticeSession,
  latestPracticeComparison,
  lockPracticeBuild,
  reconcilePracticeResult,
  resolvePractice,
  testDayAvailability,
} from "../../src/simulation/practice";
import type { Run } from "../../src/simulation/run";
import {
  preRaceSetupPracticeFixture,
  pvpBriefingPracticeFixture,
  rewardDraftPracticeFixture,
  runHubPracticeFixture,
  supplierPracticeFixture,
} from "../fixtures/practice-run-fixtures";
import {
  buffDependentPracticeBuild,
  countBuffPracticeBuild,
  directRecurringPracticeBuild,
  emptyPracticeBuild,
  flatBuffPracticeBuild,
  minimumClampPracticeBuild,
  positiveModifierPracticeBuild,
  stackingBuffPracticeBuild,
  storageActivePracticeBuild,
  tiePracticeBuild,
} from "../fixtures/practice-fixtures";
import { resolveContest } from "../../src/simulation/contest";

describe("practice domain boundary", () => {
  it("uses one immutable disclosed fixed configuration", () => {
    expect(TEST_DAY_CONFIG).toStrictEqual({
      id: "test-day-v1",
      rival: SAMPLE_GHOST,
      lapCount: 10,
      randomPolicy: "none",
    });
    expect(Object.isFrozen(TEST_DAY_CONFIG)).toBe(true);
    expect(Object.isFrozen(TEST_DAY_CONFIG.rival)).toBe(true);
  });

  it.each([
    runHubPracticeFixture,
    supplierPracticeFixture,
    rewardDraftPracticeFixture,
    pvpBriefingPracticeFixture,
  ])("creates immutable practice-only context without extending Run", (fixtureFactory) => {
    const fixture = fixtureFactory();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const before = structuredClone(fixture.run);
    const snapshot = lockPracticeBuild(fixture.run, context);
    const session = createPracticeSession(fixture.run, context);

    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(snapshot.build)).toBe(true);
    expect(session.state).toBe("briefing");
    expect(session.result).toBeNull();
    expect(fixture.run).toStrictEqual(before);
    expect("practice" in (fixture.run as Run & Record<string, unknown>)).toBe(false);
    expect(fixture.run.stages.every((stage) => !("practice" in stage))).toBe(true);
    expect(fixture.run.history.every((entry) => !("practice" in entry))).toBe(true);
  });

  it("resolves a locked build once and reconciles the authoritative result", () => {
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const completed = resolvePractice(createPracticeSession(fixture.run, context));

    expect(completed.state).toBe("completed");
    expect(completed.result?.authority).toBe("practice-only");
    expect(completed.result?.contest.lapCount).toBe(10);
    expect(reconcilePracticeResult(completed.result!.contest).valid).toBe(true);
    expect(completed.result).not.toHaveProperty("purse");
    expect(completed.result).not.toHaveProperty("progression");
  });

  it("returns typed availability failures instead of fallback inputs", () => {
    expect(testDayAvailability(null, null, { stable: true })).toStrictEqual({
      available: false,
      origin: null,
      returnContext: null,
      reason: "No active run is available for Test Day.",
      code: "no-run",
    });
  });
});

describe("practice availability matrix", () => {
  function stableOrigin() {
    const fixture = runHubPracticeFixture();
    return { run: fixture.run, origin: { context: fixture.context, selection: fixture.selection, navigation: fixture.navigation } };
  }

  it("reports malformed-run for a run object missing required run-level fields", () => {
    const { run } = stableOrigin();
    const malformed = { ...run, stages: undefined } as unknown as Run;
    const result = testDayAvailability(malformed, null, { stable: true });
    expect(result.available).toBe(false);
    expect(result.code).toBe("malformed-run");
    expect(result.reason).toBeTruthy();
  });

  it("reports run-ended for a non-active run", () => {
    const { run } = stableOrigin();
    const ended: Run = { ...run, status: "completed" };
    const result = testDayAvailability(ended, null, { stable: true });
    expect(result.code).toBe("run-ended");
  });

  it("reports invalid-build when the active build shape fails validation", () => {
    const { run } = stableOrigin();
    const invalid = { ...run, build: { ...run.build, car: undefined } } as unknown as Run;
    const result = testDayAvailability(invalid, null, { stable: true });
    expect(result.code).toBe("invalid-build");
  });

  it("reports contest-active when contest playback is in progress", () => {
    const { run, origin } = stableOrigin();
    const result = testDayAvailability(run, origin, { stable: true }, { contestActive: true });
    expect(result.available).toBe(false);
    expect(result.code).toBe("contest-active");
  });

  it("reports settlement-active when scored result settlement is in progress", () => {
    const { run, origin } = stableOrigin();
    const result = testDayAvailability(run, origin, { stable: true }, { settlementActive: true });
    expect(result.available).toBe(false);
    expect(result.code).toBe("settlement-active");
  });

  it("reports missing-origin when no return origin is supplied", () => {
    const { run } = stableOrigin();
    const result = testDayAvailability(run, null, { stable: true });
    expect(result.code).toBe("missing-origin");
  });

  it("reports recovery-mismatch when a recovery capsule fails validation", () => {
    const { run, origin } = stableOrigin();
    const result = testDayAvailability(run, origin, { stable: true }, {}, { mismatched: true, reason: "Stale recovery data no longer matches this run." });
    expect(result.available).toBe(false);
    expect(result.code).toBe("recovery-mismatch");
    expect(result.reason).toBe("Stale recovery data no longer matches this run.");
  });

  it.each([
    "drag",
    "purchase-confirmation",
    "restock-confirmation",
    "replacement-confirmation",
    "eviction-confirmation",
    "sponsor-confirmation",
  ] as const)("reports a distinct unstable-%s reason while that transaction is unresolved", (kind) => {
    const { run, origin } = stableOrigin();
    const result = testDayAvailability(run, origin, { stable: false, kind });
    expect(result.available).toBe(false);
    expect(result.code).toBe(`unstable-${kind.replace("-confirmation", "")}`);
    expect(result.reason).toBeTruthy();
  });

  it("gives every unavailable state its own distinct text-ready reason", () => {
    const { run, origin } = stableOrigin();
    const malformed = { ...run, stages: undefined } as unknown as Run;
    const invalidBuild = { ...run, build: { ...run.build, car: undefined } } as unknown as Run;
    const ended: Run = { ...run, status: "completed" };
    const reasons = [
      testDayAvailability(null, null, { stable: true }).reason,
      testDayAvailability(malformed, null, { stable: true }).reason,
      testDayAvailability(ended, null, { stable: true }).reason,
      testDayAvailability(invalidBuild, null, { stable: true }).reason,
      testDayAvailability(run, origin, { stable: true }, { contestActive: true }).reason,
      testDayAvailability(run, origin, { stable: true }, { settlementActive: true }).reason,
      testDayAvailability(run, null, { stable: true }).reason,
      testDayAvailability(run, origin, { stable: true }, {}, { mismatched: true }).reason,
      ...(["drag", "purchase-confirmation", "restock-confirmation", "replacement-confirmation", "eviction-confirmation", "sponsor-confirmation"] as const)
        .map((kind) => testDayAvailability(run, origin, { stable: false, kind }).reason),
    ];
    expect(reasons.every((reason) => typeof reason === "string" && reason.length > 0)).toBe(true);
    expect(new Set(reasons).size).toBe(reasons.length);
  });
});

describe("practice reconciliation matrix", () => {
  it.each([
    ["empty", emptyPracticeBuild],
    ["direct and recurring", directRecurringPracticeBuild],
    ["flat buff", flatBuffPracticeBuild],
    ["stacking buff", stackingBuffPracticeBuild],
    ["count buff", countBuffPracticeBuild],
    ["storage active and inactive", storageActivePracticeBuild],
    ["multiple effects", buffDependentPracticeBuild],
    ["positive modifier", positiveModifierPracticeBuild],
    ["tie", tiePracticeBuild],
    ["minimum clamp", minimumClampPracticeBuild],
  ])("reconciles %s authoritative facts exactly", (_label, buildFactory) => {
    const contest = resolveContest(buildFactory(), SAMPLE_GHOST, 10);
    const report = reconcilePracticeResult(contest);
    expect(report.valid).toBe(true);
    expect(report.checks.every(({ valid }) => valid)).toBe(true);
  });
});

function completeOnce(fixture: ReturnType<typeof runHubPracticeFixture>) {
  const context = createPracticeReturnContext(fixture.run, {
    context: fixture.context,
    selection: fixture.selection,
    navigation: fixture.navigation,
  });
  return resolvePractice(createPracticeSession(fixture.run, context));
}

describe("practice latest-two comparison", () => {
  it("retains only the latest two completed sessions for one run", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);
    const second = completeOnce(fixture);
    const third = completeOnce(fixture);

    const comparison = latestPracticeComparison(fixture.run);
    expect(comparison?.previous.sessionId).toBe(second.id);
    expect(comparison?.current.sessionId).toBe(third.id);
  });

  it("returns null before a second completed session exists", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);

    expect(latestPracticeComparison(fixture.run)).toBeNull();
  });

  it("reports zero numeric deltas for two identical snapshots", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);
    completeOnce(fixture);

    const comparison = latestPracticeComparison(fixture.run)!;
    expect(comparison.totalDelta).toBe(0);
    expect(comparison.gapDelta).toBe(0);
    expect(comparison.outcomeChanged).toBe(false);
    expect(comparison.direction).toBe("unchanged");
    expect(comparison.buildChanges).toEqual([]);
    comparison.laps.forEach((lap) => {
      expect(lap.playerTimeDelta).toBe(0);
      expect(lap.rivalTimeDelta).toBe(0);
      expect(lap.gapDelta).toBe(0);
    });
    comparison.contributions.forEach((entry) => {
      expect(entry.resultingContributionDelta).toBe(0);
      expect(entry.resultingLapTimeDelta).toBe(0);
    });
  });

  it("attributes build content changes and matching total/gap/outcome/lap/contribution deltas", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);

    fixture.run.build = flatBuffPracticeBuild();
    const current = completeOnce(fixture);

    const comparison = latestPracticeComparison(fixture.run)!;
    const previousContest = comparison.previous.contest.playerTime;
    const currentContest = current.result!.contest.playerTime;

    expect(comparison.buildChanges).toHaveLength(2);
    expect(comparison.buildChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ area: "board", index: 1, beforeItemId: "item-002", afterItemId: "item-012" }),
        expect.objectContaining({ area: "board", index: 2, beforeItemId: "item-003", afterItemId: null }),
      ]),
    );
    expect(comparison.totalDelta).toBe(currentContest - previousContest);
    expect(comparison.gapDelta).toBe(current.result!.contest.gap - comparison.previous.contest.gap);
    expect(comparison.outcomeChanged).toBe(current.result!.contest.outcome !== comparison.previous.contest.outcome);
    expect(comparison.direction).toBe(comparison.totalDelta < 0 ? "improved" : comparison.totalDelta > 0 ? "worsened" : "unchanged");
    expect(comparison.laps).toHaveLength(10);
    comparison.laps.forEach((lap, index) => {
      const previousLap = comparison.previous.contest.laps[index];
      const currentLap = comparison.current.contest.laps[index];
      expect(lap.playerTimeDelta).toBe(currentLap.playerLapTime - previousLap.playerLapTime);
      expect(lap.rivalTimeDelta).toBe(currentLap.ghostLapTime - previousLap.ghostLapTime);
    });
  });

  it("keeps stored comparison summaries immutable", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);
    completeOnce(fixture);

    const comparison = latestPracticeComparison(fixture.run)!;
    expect(Object.isFrozen(comparison)).toBe(true);
    expect(Object.isFrozen(comparison.previous)).toBe(true);
    expect(Object.isFrozen(comparison.current)).toBe(true);
    expect(Object.isFrozen(comparison.laps)).toBe(true);
    expect(Object.isFrozen(comparison.contributions)).toBe(true);
  });

  it("computes comparePracticeResults directly from two completed sessions", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    const first = completeOnce(fixture);
    const second = completeOnce(fixture);

    const direct = comparePracticeResults(first, second);
    const cached = latestPracticeComparison(fixture.run)!;
    expect(direct).toStrictEqual(cached);
  });

  it("clears retained comparisons when the run ends, is abandoned, or mismatches", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);
    completeOnce(fixture);
    expect(latestPracticeComparison(fixture.run)).not.toBeNull();

    const endedRun: Run = { ...fixture.run, status: "completed" };
    expect(latestPracticeComparison(endedRun)).toBeNull();

    const reactivatedRun: Run = { ...fixture.run, status: "active" };
    expect(latestPracticeComparison(reactivatedRun)).toBeNull();
  });

  it("clears retained comparisons when the run becomes unavailable through testDayAvailability", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);
    completeOnce(fixture);
    expect(latestPracticeComparison(fixture.run)).not.toBeNull();

    testDayAvailability({ ...fixture.run, status: "unavailable" }, null, { stable: true });

    expect(latestPracticeComparison(fixture.run)).toBeNull();
  });

  it("never retains comparisons across a different run id", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    completeOnce(fixture);
    completeOnce(fixture);

    const otherRun: Run = { ...fixture.run, id: "another-run" };
    expect(latestPracticeComparison(otherRun)).toBeNull();
    expect(latestPracticeComparison(fixture.run)).not.toBeNull();
  });
});

// 028-pre-race-setup T066: setup-origin Test Day practice domain (contract §8, FR-012D/E).
describe("setup-origin Test Day (T066)", () => {
  function openSetupOriginSession(fixture: ReturnType<typeof preRaceSetupPracticeFixture>) {
    const returnContext = createPracticeReturnContext(fixture.run, {
      context: "pre-race-setup",
      selection: fixture.selection,
      navigation: fixture.navigation,
      setupSnapshot: fixture.setupSnapshot,
    });
    return createPracticeSession(fixture.run, returnContext);
  }

  it("routes back to PreRaceScene, not RunScene", () => {
    const fixture = preRaceSetupPracticeFixture();
    const returnContext = createPracticeReturnContext(fixture.run, {
      context: "pre-race-setup",
      selection: fixture.selection,
      navigation: fixture.navigation,
      setupSnapshot: fixture.setupSnapshot,
    });

    expect(returnContext.route).toBe("PreRaceScene");
  });

  it("resolves against the exact retained upcoming track — laps carry real physics evidence", () => {
    const fixture = preRaceSetupPracticeFixture();
    const session = resolvePractice(openSetupOriginSession(fixture));

    expect(session.state).toBe("completed");
    expect(session.result!.contest.laps[0].physics).toBeDefined();
    expect(session.result!.contest.laps[0].physics!.stats).toBeDefined();
  });

  it("applies the exact temporary locked setup delta to the player's lap-stat fold", () => {
    const conservative = resolvePractice(openSetupOriginSession(preRaceSetupPracticeFixture({ "driver-aggression": "low" })));
    const balanced = resolvePractice(openSetupOriginSession(preRaceSetupPracticeFixture({})));

    // Conservative (low): acceleration -6 relative to the exact same track/build at Balanced.
    expect(conservative.result!.contest.laps[0].physics!.stats.acceleration)
      .toBe(balanced.result!.contest.laps[0].physics!.stats.acceleration - 6);
  });

  it("remains explicitly unscored — result carries no run/encounterId/scored authority", () => {
    const fixture = preRaceSetupPracticeFixture();
    const session = resolvePractice(openSetupOriginSession(fixture));

    expect(session.result!.authority).toBe("practice-only");
    expect(session.result).not.toHaveProperty("run");
    expect(session.result).not.toHaveProperty("encounterId");
  });

  it("does not write remembered setup or advance/settle the run", () => {
    const fixture = preRaceSetupPracticeFixture();
    const before = structuredClone(fixture.run);
    resolvePractice(openSetupOriginSession(fixture));

    expect(fixture.run).toEqual(before);
    expect(fixture.run.setupMemory).toBeUndefined();
  });
});