import type { ExhibitionResult, ExhibitionTrial } from "../simulation/exhibition";

/**
 * Feature 034 Exhibition briefing + result view models (034 task T056, UR3).
 * Pure and Phaser-free: briefing surfaces committed objectives and thresholds
 * before entry; results reconcile each objective to its actual/achieved state
 * without pulling in a scoreboard.
 */

export interface ExhibitionObjectiveView {
  family: string;
  description: string;
  threshold: number;
  /** Only present once a race has been resolved. */
  completed: boolean | null;
  actual: number | null;
}

export interface ExhibitionBriefingView {
  trialId: string;
  objectives: readonly ExhibitionObjectiveView[];
  lapCount: number;
}

export interface ExhibitionResultView {
  score: number;
  reputationAward: number;
  completedCount: number;
  objectives: readonly ExhibitionObjectiveView[];
  championshipUnchanged: true;
}

/** Pre-entry briefing from a committed trial, no results yet. */
export function exhibitionBriefingView(trial: ExhibitionTrial, lapCount: number): ExhibitionBriefingView {
  return {
    trialId: trial.trialId,
    lapCount,
    objectives: trial.objectives.map((objective) => ({
      family: objective.family,
      description: objective.description,
      threshold: objective.committedThreshold,
      completed: null,
      actual: null,
    })),
  };
}

/** Post-race result reconciled against the committed objectives (score 0–3). */
export function exhibitionResultView(result: ExhibitionResult): ExhibitionResultView {
  return {
    score: result.score,
    reputationAward: result.reputationAward,
    completedCount: result.completedCount,
    championshipUnchanged: true,
    objectives: result.objectives.map((outcome) => ({
      family: outcome.family,
      description: descriptionForFamily(outcome.family),
      threshold: outcome.threshold,
      completed: outcome.completed,
      actual: outcome.actual,
    })),
  };
}

function descriptionForFamily(family: string): string {
  if (family === "time") return "Beat the scheduled lap time";
  if (family === "activation") return "Fire the committed item activations";
  return "Meet the circuit's characteristic demand";
}
