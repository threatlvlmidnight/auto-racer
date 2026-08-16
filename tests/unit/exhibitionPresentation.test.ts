import { describe, expect, it } from "vitest";
import { generateExhibitionTrial, evaluateExhibitionResult } from "../../src/simulation/exhibition";
import { exhibitionBriefingView, exhibitionResultView } from "../../src/scenes/exhibitionPresentation";

describe("exhibitionBriefingView — pre-entry objectives (T056)", () => {
  it("surfaces committed thresholds before any results", () => {
    const trial = generateExhibitionTrial(7, 1);
    const briefing = exhibitionBriefingView(trial, 8);
    expect(briefing.trialId).toBe("exhibition-1");
    expect(briefing.lapCount).toBe(8);
    expect(briefing.objectives).toHaveLength(3);
    briefing.objectives.forEach((objective) => {
      expect(objective.completed).toBeNull();
      expect(objective.actual).toBeNull();
      expect(objective.threshold).toBeGreaterThan(0);
    });
  });
});

describe("exhibitionResultView — post-race reconcile (T056)", () => {
  it("reconciles score, reputation, and per-objective actuals", () => {
    const trial = generateExhibitionTrial(7, 1);
    const result = evaluateExhibitionResult(trial, { fastestLapTime: 5.0, itemActivations: 99, demandScore: 99 });
    const view = exhibitionResultView(result);
    expect(view.score).toBe(3);
    expect(view.reputationAward).toBe(3);
    expect(view.championshipUnchanged).toBe(true);
    expect(view.objectives.every((objective) => objective.completed === true)).toBe(true);
    expect(view.objectives.every((objective) => typeof objective.actual === "number")).toBe(true);
  });
});
