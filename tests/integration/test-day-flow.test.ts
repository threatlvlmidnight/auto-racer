import { describe, expect, it } from "vitest";
import {
  cancelPracticeSession,
  captureProtectedRunState,
  clearPracticeComparisonHistory,
  createPracticeReturnContext,
  createPracticeSession,
  latestPracticeComparison,
  practiceReturnData,
  resolvePractice,
  testDayAvailability,
} from "../../src/simulation/practice";
import {
  practiceBriefingControlPlan,
  practiceContestControlPlan,
  practiceEvidenceModel,
  practiceResultControlPlan,
} from "../../src/scenes/practicePresentation";
import { buildPlaybackSchedule, frameStateAt } from "../../src/simulation/playback";
import {
  allPracticeRunFixtures,
  preRaceSetupPracticeFixture,
  rewardDraftPracticeFixture,
  runHubPracticeFixture,
  supplierPracticeFixture,
} from "../fixtures/practice-run-fixtures";
import {
  buffDependentPracticeBuild,
  directRecurringPracticeBuild,
  flatBuffPracticeBuild,
} from "../fixtures/practice-fixtures";

function begin(fixture: ReturnType<(typeof allPracticeRunFixtures)[number]>) {
  const context = createPracticeReturnContext(fixture.run, {
    context: fixture.context,
    selection: fixture.selection,
    navigation: fixture.navigation,
  });
  return { context, session: createPracticeSession(fixture.run, context) };
}

describe("Test Day exact-return flow", () => {
  it.each(allPracticeRunFixtures)(
    "cancels briefing and active playback back to the exact origin object",
    (fixtureFactory) => {
      const fixture = fixtureFactory();
      const before = structuredClone(fixture.run);
      const protectedBefore = captureProtectedRunState(fixture.run);
      const { session } = begin(fixture);
      const cancelled = cancelPracticeSession(session);
      const returned = practiceReturnData(fixture.run, cancelled);

      expect(cancelled.state).toBe("returning");
      expect(cancelled.result).toBeNull();
      expect(returned.run).toBe(fixture.run);
      expect(returned.run).toStrictEqual(before);
      expect(captureProtectedRunState(returned.run)).toStrictEqual(protectedBefore);
      expect(returned.route).toBe(session.returnContext.route);
      expect(returned.encounterId).toBe(session.returnContext.encounterId);
      expect(returned.originState).toStrictEqual(session.returnContext.originState);
      expect(returned.focusToken).toBe(fixture.navigation.focusToken);
    },
  );

  it.each([supplierPracticeFixture, rewardDraftPracticeFixture])(
    "preserves exact Supplier and Reward Draft payload, selection, offers, and state",
    (fixtureFactory) => {
      const fixture = fixtureFactory(true);
      const payload = structuredClone(fixture.run.activeEncounter!.payload);
      const encounterId = fixture.run.activeEncounter!.id;
      const { session } = begin(fixture);
      const returned = practiceReturnData(fixture.run, resolvePractice(session));

      expect(returned.run).toBe(fixture.run);
      expect(returned.run.activeEncounter!.id).toBe(encounterId);
      expect(returned.run.activeEncounter!.payload).toStrictEqual(payload);
      expect(returned.originState.selection).toBe(fixture.selection);
      expect(returned.originState.navigation).toStrictEqual(fixture.navigation);
    },
  );

  it("uses one snapshot for rapid double activation and never mutates the run", () => {
    const fixture = supplierPracticeFixture();
    const before = structuredClone(fixture.run);
    const { context, session } = begin(fixture);
    const duplicate = createPracticeSession(fixture.run, context);
    const completed = resolvePractice(session);

    expect(duplicate).toBe(session);
    expect(duplicate.snapshot).toBe(session.snapshot);
    expect(completed.result?.authority).toBe("practice-only");
    expect(fixture.run).toStrictEqual(before);
  });
});

describe("Test Day repeat and comparison flow", () => {
  it.each([supplierPracticeFixture, rewardDraftPracticeFixture])(
    "compares the latest two tests after one normal build change and repeats without limit or run-history entries",
    (fixtureFactory) => {
      const fixture = fixtureFactory(true);
      clearPracticeComparisonHistory(fixture.run.id);
      const historyBefore = structuredClone(fixture.run.history);
      const scoredCountBefore = captureProtectedRunState(fixture.run).scoredResultCount;

      const first = begin(fixture);
      const completedFirst = resolvePractice(first.session);
      const returnedFirst = practiceReturnData(fixture.run, completedFirst);
      expect(returnedFirst.run).toBe(fixture.run);
      expect(fixture.run.history).toStrictEqual(historyBefore);

      fixture.run.build = flatBuffPracticeBuild();
      const second = begin(fixture);
      const completedSecond = resolvePractice(second.session);
      practiceReturnData(fixture.run, completedSecond);

      const comparisonAfterSecond = latestPracticeComparison(fixture.run)!;
      expect(comparisonAfterSecond).not.toBeNull();
      expect(comparisonAfterSecond.previous.sessionId).toBe(completedFirst.id);
      expect(comparisonAfterSecond.current.sessionId).toBe(completedSecond.id);
      expect(comparisonAfterSecond.buildChanges.length).toBeGreaterThan(0);

      fixture.run.build = buffDependentPracticeBuild();
      const third = begin(fixture);
      const completedThird = resolvePractice(third.session);
      practiceReturnData(fixture.run, completedThird);

      const comparisonAfterThird = latestPracticeComparison(fixture.run)!;
      expect(comparisonAfterThird.previous.sessionId).toBe(completedSecond.id);
      expect(comparisonAfterThird.current.sessionId).toBe(completedThird.id);

      expect(fixture.run.history).toStrictEqual(historyBefore);
      expect(captureProtectedRunState(fixture.run).scoredResultCount).toBe(scoredCountBefore);
    },
  );
});

describe("Test Day keyboard-only and touch-only input parity", () => {
  it("reaches an identical completed session whether Start Test is triggered by keyboard, pointer, or touch", () => {
    const keyboardFixture = supplierPracticeFixture();
    const pointerFixture = supplierPracticeFixture();
    const touchFixture = supplierPracticeFixture();

    const keyboardResult = resolvePractice(begin(keyboardFixture).session);
    const pointerResult = resolvePractice(begin(pointerFixture).session);
    const touchResult = resolvePractice(begin(touchFixture).session);

    expect(keyboardResult.result?.contest).toStrictEqual(pointerResult.result?.contest);
    expect(pointerResult.result?.contest).toStrictEqual(touchResult.result?.contest);
  });

  it("reaches an identical cancelled return whether Cancel is triggered by Escape, pointer, or touch", () => {
    const fixture = runHubPracticeFixture();
    const before = structuredClone(fixture.run);
    const { session } = begin(fixture);

    const returned = practiceReturnData(fixture.run, cancelPracticeSession(session));

    expect(returned.run).toStrictEqual(before);
    expect(returned.route).toBe(session.returnContext.route);
  });

  it("exposes every briefing, contest, and result control with a keyboard binding and pointer/touch parity", () => {
    const fixture = runHubPracticeFixture();
    const availability = testDayAvailability(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    }, { stable: true });

    const allControls = [
      ...practiceBriefingControlPlan(availability),
      ...practiceContestControlPlan(),
      ...practiceResultControlPlan(),
    ];
    expect(allControls.length).toBeGreaterThan(0);
    allControls.forEach((control) => {
      expect(control.keyBinding.length).toBeGreaterThan(0);
      expect(control.pointer).toBe(true);
      expect(control.touch).toBe(true);
    });
  });

  it("exposes complete contribution evidence for every lap without any hover-triggered fetch", () => {
    const fixture = runHubPracticeFixture();
    fixture.run.build = buffDependentPracticeBuild();
    const completed = resolvePractice(begin(fixture).session);
    const model = practiceEvidenceModel(completed.result!.contest, completed.result!.reconciliation);

    const heldItemIds = new Set([...completed.result!.contest.board, ...completed.result!.contest.storage].map((item) => item.id));
    heldItemIds.forEach((itemId) => {
      const rows = model.contributions.filter((entry) => entry.itemId === itemId);
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => {
        expect(typeof row.state).toBe("string");
        expect(typeof row.contribution).toBe("number");
      });
    });
  });
});

describe("Test Day reduced-motion and playback-speed invariance", () => {
  it("produces the exact same finished frame facts regardless of how quickly visual time advances toward completion", () => {
    const fixture = runHubPracticeFixture();
    fixture.run.build = directRecurringPracticeBuild();
    const completed = resolvePractice(begin(fixture).session);
    const schedule = buildPlaybackSchedule(completed.result!.contest);
    const finalBoundary = Math.max(
      schedule.player.visualLapBoundaries[schedule.player.visualLapBoundaries.length - 1] ?? 0,
      schedule.ghost.visualLapBoundaries[schedule.ghost.visualLapBoundaries.length - 1] ?? 0,
    );

    const naturalPace = frameStateAt(schedule, completed.result!.contest, finalBoundary, -1);
    const skipped = frameStateAt(schedule, completed.result!.contest, Number.POSITIVE_INFINITY, -1);
    const fastForwarded = frameStateAt(schedule, completed.result!.contest, finalBoundary * 50, -1);

    expect(naturalPace.player.finished).toBe(true);
    expect(naturalPace.ghost.finished).toBe(true);
    expect(skipped.player).toStrictEqual(naturalPace.player);
    expect(skipped.ghost).toStrictEqual(naturalPace.ghost);
    expect(skipped.liveGap).toBe(naturalPace.liveGap);
    expect(fastForwarded.player).toStrictEqual(naturalPace.player);
    expect(fastForwarded.liveGap).toBe(naturalPace.liveGap);
  });

  it("keeps player/ghost progress and live gap identical at a given visual time regardless of presentation-only callout bookkeeping", () => {
    const fixture = runHubPracticeFixture();
    fixture.run.build = buffDependentPracticeBuild();
    const completed = resolvePractice(begin(fixture).session);
    const schedule = buildPlaybackSchedule(completed.result!.contest);
    const midpoint = (schedule.player.visualLapBoundaries[schedule.player.visualLapBoundaries.length - 1] ?? 0) / 2;

    const withFreshCallouts = frameStateAt(schedule, completed.result!.contest, midpoint, -1);
    const withStaleCallouts = frameStateAt(schedule, completed.result!.contest, midpoint, 9999);

    expect(withFreshCallouts.player).toStrictEqual(withStaleCallouts.player);
    expect(withFreshCallouts.ghost).toStrictEqual(withStaleCallouts.ghost);
    expect(withFreshCallouts.liveGap).toBe(withStaleCallouts.liveGap);
  });
});

// 028-pre-race-setup T067: setup-origin Test Day entry and exact return.
describe("setup-origin Test Day entry and return (T067)", () => {
  function beginSetupOrigin(fixture: ReturnType<typeof preRaceSetupPracticeFixture>) {
    const context = createPracticeReturnContext(fixture.run, {
      context: "pre-race-setup",
      selection: fixture.selection,
      navigation: fixture.navigation,
      setupSnapshot: fixture.setupSnapshot,
    });
    return { context, session: createPracticeSession(fixture.run, context) };
  }

  it("carries the exact setup snapshot through the return context's protected origin state", () => {
    const fixture = preRaceSetupPracticeFixture({ "driver-aggression": "high" }, true);
    const { context } = beginSetupOrigin(fixture);

    expect(context.originState.setupSnapshot).toEqual(fixture.setupSnapshot);
    expect(context.route).toBe("PreRaceScene");
  });

  it("returns to the exact uncommitted draft selections, checkbox, and focus family — never the run's remembered/Balanced defaults", () => {
    const fixture = preRaceSetupPracticeFixture({ "driver-aggression": "high" }, true);
    const { session } = beginSetupOrigin(fixture);
    const returned = practiceReturnData(fixture.run, cancelPracticeSession(session));

    expect(returned.route).toBe("PreRaceScene");
    expect(returned.originState.setupSnapshot).toEqual(fixture.setupSnapshot);
    expect(returned.originState.setupSnapshot!.draftSelections).toEqual({ "driver-aggression": "high" });
    expect(returned.originState.setupSnapshot!.rememberChecked).toBe(true);
  });

  it("supports repeated testing: entering, canceling, and re-entering reproduces the identical resolved result", () => {
    const fixture = preRaceSetupPracticeFixture({ "driver-aggression": "low" });
    const first = resolvePractice(beginSetupOrigin(fixture).session);
    const second = resolvePractice(beginSetupOrigin(fixture).session);

    expect(second.result!.contest).toEqual(first.result!.contest);
  });
});