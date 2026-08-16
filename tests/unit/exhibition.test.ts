import { describe, expect, it } from "vitest";
import {
  evaluateExhibitionResult,
  exhibitionEvidenceFromResult,
  generateExhibitionTrial,
  resolveSoloExhibitionContest,
  type ExhibitionContestEvidence,
} from "../../src/simulation/exhibition";
import { resolveContest } from "../../src/simulation/contest";
import { vehicleBuild } from "../fixtures/vehicle-build-fixtures";

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

describe("T055 — Exhibition reuses real race authority without Championship mutation", () => {
  it("resolves through the standard retained race contract with only the player car", () => {
    const first = resolveSoloExhibitionContest({
      build: vehicleBuild([]), entrantId: "evelyn-mercer", seed: 34, level: 9, lapCount: 10,
    });
    const second = resolveSoloExhibitionContest({
      build: vehicleBuild([]), entrantId: "evelyn-mercer", seed: 34, level: 9, lapCount: 10,
    });

    expect(first).toEqual(second);
    expect(first.cars).toHaveLength(1);
    expect(first.cars[0]).toMatchObject({ role: "player", position: 1 });
    expect(first.events).toEqual([]);
    expect(first.incidentsEnabled).toBe(false);
    expect(exhibitionEvidenceFromResult(first).fastestLapTime).toBeGreaterThan(0);
  });

  it("derives Exhibition evidence from the retained solo contest and confirms isolation", () => {
    const build = vehicleBuild([]);
    const contest = resolveContest(build, { id: "exhibition-ghost", lapTime: 6 }, 8);
    const evidence: ExhibitionContestEvidence = {
      fastestLapTime: Math.min(...contest.laps.map((lap) => lap.playerLapTime)),
      itemActivations: contest.laps.reduce((sum, lap) => sum + lap.firedItems.length, 0),
      demandScore: 0,
    };
    const trial = generateExhibitionTrial(7, 1);
    const result = evaluateExhibitionResult(trial, evidence);

    // The solo contest result carries no scored authority surface at all.
    expect(contest).not.toHaveProperty("standings");
    expect(contest).not.toHaveProperty("points");
    expect(contest).not.toHaveProperty("rival");
    // And Exhibition settlement can never touch Championship state.
    expect(result.championshipUnchanged).toBe(true);
    expect([0, 1, 2, 3]).toContain(result.score);
  });
});
