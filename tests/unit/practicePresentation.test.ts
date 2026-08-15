import { describe, expect, it } from "vitest";
import {
  clearPracticeComparisonHistory,
  createPracticeReturnContext,
  createPracticeSession,
  latestPracticeComparison,
  resolvePractice,
} from "../../src/simulation/practice";
import { practiceBriefingModel } from "../../src/scenes/practicePresentation";
import { practiceEvidenceModel } from "../../src/scenes/practicePresentation";
import { practiceComparisonModel } from "../../src/scenes/practicePresentation";
import {
  PRACTICE_MIN_CONTROL_LABEL_PX,
  PRACTICE_MIN_SUPPORTING_TEXT_PX,
  PRACTICE_REQUIRED_VIEWPORTS,
  PRACTICE_STATE_TOKENS,
  buildPracticeResponsiveLayout,
  fitPracticeLabel,
  practiceBriefingControlPlan,
  practiceContestControlPlan,
  practiceResultControlPlan,
  prepareTestDayControlVisible,
} from "../../src/scenes/practicePresentation";
import { testDayAvailability } from "../../src/simulation/practice";
import { resolveContest } from "../../src/simulation/contest";
import { SAMPLE_GHOST } from "../../src/content/sample-data";
import { reconcilePracticeResult } from "../../src/simulation/practice";
import {
  buffDependentPracticeBuild,
  countBuffPracticeBuild,
  emptyPracticeBuild,
  flatBuffPracticeBuild,
  minimumClampPracticeBuild,
  tiePracticeBuild,
} from "../fixtures/practice-fixtures";
import { runHubPracticeFixture } from "../fixtures/practice-run-fixtures";

describe("practice briefing presentation", () => {
  it("hides Test Day during Reward Draft while retaining valid preparation entries", () => {
    expect(prepareTestDayControlVisible("reward-draft")).toBe(false);
    expect(prepareTestDayControlVisible("parts-supplier")).toBe(true);
    expect(prepareTestDayControlVisible("cross-pollination")).toBe(true);
  });

  it("discloses the locked deterministic unscored sample and consequences", () => {
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const session = createPracticeSession(fixture.run, context);
    const model = practiceBriefingModel(session);

    expect(model.title).toBe("TEST DAY");
    expect(model.status).toBe("UNSCORED");
    expect(model.rival).toBe("ghost-001 · deterministic sample rival");
    expect(model.configuration).toBe("10 laps · 5.85 seconds per rival lap");
    expect(model.snapshot).toContain(session.snapshot.fingerprint);
    expect(model.consequences).toEqual([
      "No rewards or penalties",
      "No sponsor or economy changes",
      "No championship progression",
    ]);
  });
});

describe("practice evidence presentation", () => {
  it.each([
    buffDependentPracticeBuild,
    emptyPracticeBuild,
    minimumClampPracticeBuild,
    tiePracticeBuild,
  ])("formats only exact immutable contest and reconciliation facts", (buildFactory) => {
    const contest = resolveContest(buildFactory(), SAMPLE_GHOST, 10);
    const model = practiceEvidenceModel(contest, reconcilePracticeResult(contest));

    expect(model.title).toBe("TEST DAY · UNSCORED");
    expect(model.playerTotal.value).toBe(contest.playerTime);
    expect(model.rivalTotal.value).toBe(contest.ghostTime);
    expect(model.gap.value).toBe(contest.gap);
    expect(model.outcome).toBe(contest.outcome);
    expect(model.laps).toHaveLength(10);
    model.laps.forEach((row, index) => {
      expect(row.playerTime).toBe(contest.laps[index].playerLapTime);
      expect(row.rivalTime).toBe(contest.laps[index].ghostLapTime);
    });
    expect(model.reconciliation).toBe("RECONCILED");
  });

  it("keeps buff relationships explanatory and explicit zero/inactive rows visible", () => {
    const contest = resolveContest(buffDependentPracticeBuild(), SAMPLE_GHOST, 10);
    const model = practiceEvidenceModel(contest, reconcilePracticeResult(contest));
    const direct = model.contributions.find((row) => row.itemId === "item-001" && row.lap === 1)!;
    const inactive = model.contributions.find((row) => row.itemId === "item-004" && row.lap === 1)!;

    expect(direct.buffs.map(({ sourceItemId, type }) => ({ sourceItemId, type }))).toEqual(
      expect.arrayContaining([
        { sourceItemId: "item-012", type: "flat" },
        { sourceItemId: "item-014", type: "stacking" },
      ]),
    );
    expect(inactive).toMatchObject({ state: "inactive-storage", contribution: 0 });
    expect(inactive.reason).toContain("inactive");

    const countContest = resolveContest(countBuffPracticeBuild(), SAMPLE_GHOST, 10);
    const countModel = practiceEvidenceModel(countContest, reconcilePracticeResult(countContest));
    expect(countModel.contributions.find((row) => row.itemId === "item-001" && row.lap === 1)?.buffs)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceItemId: "item-015", type: "count" }),
      ]));
  });
});

function completeTwice(fixture: ReturnType<typeof runHubPracticeFixture>) {
  clearPracticeComparisonHistory(fixture.run.id);
  const context = createPracticeReturnContext(fixture.run, {
    context: fixture.context,
    selection: fixture.selection,
    navigation: fixture.navigation,
  });
  resolvePractice(createPracticeSession(fixture.run, context));
  fixture.run.build = flatBuffPracticeBuild();
  const secondContext = createPracticeReturnContext(fixture.run, {
    context: fixture.context,
    selection: fixture.selection,
    navigation: fixture.navigation,
  });
  resolvePractice(createPracticeSession(fixture.run, secondContext));
  return latestPracticeComparison(fixture.run)!;
}

describe("practice comparison presentation", () => {
  it("labels the overall change as improved, worsened, or unchanged in text", () => {
    const comparison = completeTwice(runHubPracticeFixture());
    const model = practiceComparisonModel(comparison);

    expect(["IMPROVED", "WORSENED", "UNCHANGED"]).toContain(model.direction);
    expect(model.totalDeltaLabel).toMatch(/^[+-]?\d+\.\d{2} s$/);
    expect(model.gapDeltaLabel).toMatch(/^[+-]?\d+\.\d{2} s$/);
    expect(model.outcomeLabel.length).toBeGreaterThan(0);
  });

  it("reports zero-delta comparisons as explicitly unchanged, never blank", () => {
    const fixture = runHubPracticeFixture();
    clearPracticeComparisonHistory(fixture.run.id);
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    resolvePractice(createPracticeSession(fixture.run, context));
    resolvePractice(createPracticeSession(fixture.run, context));
    const comparison = latestPracticeComparison(fixture.run)!;
    const model = practiceComparisonModel(comparison);

    expect(model.direction).toBe("UNCHANGED");
    expect(model.totalDeltaLabel).toBe("0.00 s");
    expect(model.buildChanges).toEqual([]);
    model.laps.forEach((lap) => expect(lap.state).toBe("unchanged"));
  });

  it("writes full untruncated item names into build-change and contribution labels", () => {
    const comparison = completeTwice(runHubPracticeFixture());
    const model = practiceComparisonModel(comparison);

    const boardChange = model.buildChanges.find((change) => change.area === "board" && change.index === 1)!;
    expect(boardChange.label).toContain("Lightweight Flywheel");
    expect(boardChange.label).toContain("Performance Calibration Suite");
    expect(boardChange.label).toContain("->");
    expect(boardChange.state).toBe("changed");

    const emptiedSlot = model.buildChanges.find((change) => change.area === "board" && change.index === 2)!;
    expect(emptiedSlot.label).toContain("Empty slot");
  });

  it("carries a textual state alongside every changed/lap/contribution row, not color alone", () => {
    const comparison = completeTwice(runHubPracticeFixture());
    const model = practiceComparisonModel(comparison);

    model.buildChanges.forEach((change) => expect(typeof change.state).toBe("string"));
    model.laps.forEach((lap) => expect(["improved", "worsened", "unchanged"]).toContain(lap.state));
    model.contributions.forEach((entry) => expect(["improved", "worsened", "unchanged"]).toContain(entry.state));
    expect(model.laps.every((lap) => lap.label.length > 0)).toBe(true);
  });
});

describe("practice semantic state tokens", () => {
  it("gives every required semantic state a non-color text and icon token", () => {
    const states = ["unscored", "selected", "focused", "disabled", "unavailable", "changed", "improved", "worsened"] as const;
    states.forEach((state) => {
      const token = PRACTICE_STATE_TOKENS[state];
      expect(token.text.length).toBeGreaterThan(0);
      expect(token.icon.length).toBeGreaterThan(0);
    });
    const texts = states.map((state) => PRACTICE_STATE_TOKENS[state].text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("practice control focus order and input parity", () => {
  it("orders briefing controls with a keyboard binding, pointer, and touch parity for every control", () => {
    const fixture = runHubPracticeFixture();
    const context = createPracticeReturnContext(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    });
    const availability = testDayAvailability(fixture.run, {
      context: fixture.context,
      selection: fixture.selection,
      navigation: fixture.navigation,
    }, { stable: true });
    const controls = practiceBriefingControlPlan(availability);

    expect(controls.map((control) => control.order)).toEqual([...controls.keys()]);
    controls.forEach((control) => {
      expect(control.pointer).toBe(true);
      expect(control.touch).toBe(true);
      expect(control.focusVisible).toBe(true);
      expect(control.keyBinding.length).toBeGreaterThan(0);
    });
    expect(controls.find((control) => control.id === "start-test")?.enabled).toBe(true);
    void context;
  });

  it("disables start-test with the exact availability reason when unavailable", () => {
    const availability = testDayAvailability(null, null, { stable: true });
    const controls = practiceBriefingControlPlan(availability);
    const start = controls.find((control) => control.id === "start-test")!;
    expect(start.enabled).toBe(false);
    expect(start.disabledReason).toBe(availability.reason);
  });

  it("gives contest playback controls deterministic focus order and full input parity", () => {
    const controls = practiceContestControlPlan();
    expect(controls.map((control) => control.order)).toEqual([...controls.keys()]);
    // 030-race-playback-controls (T039/T040): the legacy SPEED/F control was
    // removed; direct 1×/2× controls (playbackControlPlan) replace it.
    expect(controls.map((control) => control.id)).toEqual(["cancel", "pause", "skip"]);
    controls.forEach((control) => {
      expect(control.pointer).toBe(true);
      expect(control.touch).toBe(true);
      expect(control.keyBinding.length).toBeGreaterThan(0);
    });
  });

  it("gives result controls deterministic order with return and repeat always enabled", () => {
    const controls = practiceResultControlPlan();
    expect(controls.map((control) => control.id)).toEqual(["return", "repeat-test"]);
    expect(controls.every((control) => control.enabled)).toBe(true);
  });
});

describe("practice minimum text and control sizes", () => {
  it("declares supporting text and control label minimums matching FR-025", () => {
    expect(PRACTICE_MIN_SUPPORTING_TEXT_PX).toBe(14);
    expect(PRACTICE_MIN_CONTROL_LABEL_PX).toBe(16);
  });
});

describe("practice long-label containment", () => {
  it("wraps long labels into multiple lines rather than exceeding the available width", () => {
    const longLabel = "Performance Calibration Suite contribution reconciled against Lightweight Flywheel storage-active buff stacking";
    const fitted = fitPracticeLabel(longLabel, 260, PRACTICE_MIN_SUPPORTING_TEXT_PX);
    expect(fitted.lines.length).toBeGreaterThan(1);
    expect(fitted.overflow).toBe(false);
    const maxChars = Math.floor(260 / (PRACTICE_MIN_SUPPORTING_TEXT_PX * 0.58));
    fitted.lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(maxChars));
  });

  it("marks overflow true only when a single unbreakable token cannot fit", () => {
    const fitted = fitPracticeLabel("Supercalifragilisticexpialidocious-Turbocharger-9000", 80, 16);
    expect(fitted.overflow).toBe(true);
  });

  it("keeps a short label on one line with no overflow", () => {
    const fitted = fitPracticeLabel("TEST DAY", 260, 16);
    expect(fitted.lines).toEqual(["TEST DAY"]);
    expect(fitted.overflow).toBe(false);
  });
});

describe("practice responsive vertical-flow layout", () => {
  const sections = [
    { id: "title", minHeightPx: 32 },
    { id: "status", minHeightPx: 24 },
    { id: "rival", minHeightPx: 20 },
    { id: "evidence", minHeightPx: 120 },
    { id: "cancel", minHeightPx: 40, isControl: true as const },
    { id: "start-test", minHeightPx: 40, isControl: true as const },
  ];

  Object.entries(PRACTICE_REQUIRED_VIEWPORTS).forEach(([preset, viewport]) => {
    it(`produces zero horizontal overflow and minimum text/control sizes at ${preset}`, () => {
      const layout = buildPracticeResponsiveLayout(viewport, sections);

      expect(layout.horizontalOverflow).toBe(false);
      layout.regions.forEach((region) => {
        expect(region.x + region.width).toBeLessThanOrEqual(viewport.width);
        expect(region.width).toBeGreaterThan(0);
      });
      const controlRegions = layout.regions.filter((region) =>
        sections.find((section) => section.id === region.id)?.isControl);
      const textRegions = layout.regions.filter((region) =>
        !sections.find((section) => section.id === region.id)?.isControl);
      controlRegions.forEach((region) => expect(region.textPx).toBeGreaterThanOrEqual(PRACTICE_MIN_CONTROL_LABEL_PX));
      textRegions.forEach((region) => expect(region.textPx).toBeGreaterThanOrEqual(PRACTICE_MIN_SUPPORTING_TEXT_PX));
    });

    it(`stacks sections vertically without overlap at ${preset}`, () => {
      const layout = buildPracticeResponsiveLayout(viewport, sections);
      for (let index = 0; index < layout.regions.length - 1; index += 1) {
        const current = layout.regions[index];
        const next = layout.regions[index + 1];
        expect(current.y + current.height).toBeLessThanOrEqual(next.y);
      }
    });
  });
});
