import { describe, expect, it } from "vitest";
import {
  evaluateExhibitionResult,
  generateExhibitionTrial,
  type ExhibitionContestEvidence,
} from "../../src/simulation/exhibition";

describe("generateExhibitionTrial — objective commitment (T051/T053)", () => {
  it("creates exactly one objective from each of the three families", () => {
    const trial = generateExhibitionTrial(7, 1);
    const families = trial.objectives.map((objective) => objective.family);
    expect(families.sort()).toEqual(["activation", "demand", "time"]);
    expect(trial.trialId).toBe("exhibition-1");
  });

  it("is deterministic across identical inputs", () => {
    const first = generateExhibitionTrial(42, 3);
    const second = generateExhibitionTrial(42, 3);
    expect(second).toEqual(first);
  });
});

describe("evaluateExhibitionResult — scoring 0–3 (T051/T054/FR-041)", () => {
  function scoreFor(trial: ReturnType<typeof generateExhibitionTrial>, evidence: ExhibitionContestEvidence): number {
    return evaluateExhibitionResult(trial, evidence).score;
  }

  it("awards zero when no objective is met", () => {
    const trial = generateExhibitionTrial(7, 1);
    expect(scoreFor(trial, { fastestLapTime: 999, itemActivations: 0, demandScore: 0 })).toBe(0);
  });

  it("awards three when every objective is met", () => {
    const trial = generateExhibitionTrial(7, 1);
    expect(scoreFor(trial, { fastestLapTime: 5.0, itemActivations: 99, demandScore: 99 })).toBe(3);
  });

  it("awards exactly 1 reputation per completed objective", () => {
    const trial = generateExhibitionTrial(7, 1);
    const result = evaluateExhibitionResult(trial, { fastestLapTime: 5.0, itemActivations: 0, demandScore: 0 });
    expect(result.completedCount).toBe(1);
    expect(result.score).toBe(1);
    expect(result.reputationAward).toBe(result.completedCount);
  });

  it("every result confirms Championship state is unchanged (T055)", () => {
    const trial = generateExhibitionTrial(7, 2);
    const result = evaluateExhibitionResult(trial, { fastestLapTime: 5.0, itemActivations: 99, demandScore: 99 });
    expect(result.championshipUnchanged).toBe(true);
  });

  it("retains exact per-objective evidence (actual vs threshold)", () => {
    const trial = generateExhibitionTrial(7, 1);
    const result = evaluateExhibitionResult(trial, { fastestLapTime: 5.0, itemActivations: 99, demandScore: 99 });
    expect(result.objectives).toHaveLength(3);
    result.objectives.forEach((outcome) => {
      expect(typeof outcome.actual).toBe("number");
      expect(typeof outcome.threshold).toBe("number");
    });
  });
});
