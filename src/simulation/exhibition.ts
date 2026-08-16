/**
 * Exhibition Trial — an unscored solo race with three precommitted objectives
 * from the time, item-activation, and track-demand families (034 tasks
 * T051/T053/T054/T055, spec FR-041). Each completed objective awards exactly
 * one reputation; Championship points/standings/rival records and scored-race
 * effects are never touched. Fully seed-deterministic.
 */

export type ExhibitionObjectiveFamily = "time" | "activation" | "demand";

/** A committed objective threshold generated before entry (034 T053). */
export interface ExhibitionObjective {
  family: ExhibitionObjectiveFamily;
  /** The committed threshold the player must meet to complete this objective. */
  committedThreshold: number;
  description: string;
}

export interface ExhibitionTrial {
  trialId: string;
  seed: number;
  /** One objective from each family, in a fixed order (time, activation, demand). */
  objectives: readonly ExhibitionObjective[];
}

export interface ExhibitionContestEvidence {
  /** Fastest per-lap seconds achieved in the solo race. */
  fastestLapTime: number;
  /** Total item activations across the race. */
  itemActivations: number;
  /** 0–100 measure of how well the build met the circuit's characteristic demand. */
  demandScore: number;
}

export interface ExhibitionObjectiveOutcome {
  family: ExhibitionObjectiveFamily;
  completed: boolean;
  actual: number;
  threshold: number;
}

export interface ExhibitionResult {
  trialId: string;
  score: 0 | 1 | 2 | 3;
  reputationAward: number;
  completedCount: number;
  objectives: readonly ExhibitionObjectiveOutcome[];
  /** Guaranteed literal: Exhibition never mutates Championship state (T055). */
  championshipUnchanged: true;
}

/** mulberry32 seeded PRNG for objective generation (no library dependency). */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministically generates a trial with one objective per family (T053). */
export function generateExhibitionTrial(
  seed: number,
  trialOrdinal: number,
): ExhibitionTrial {
  const rng = seededRandom(seed + trialOrdinal * 1013);
  const timeThreshold = 5.7 + rng() * 0.5; // seconds-per-lap bar
  const activationThreshold = 3 + Math.floor(rng() * 4); // 3..6 activations
  const demandThreshold = 55 + Math.floor(rng() * 30); // 55..84 demand score
  return {
    trialId: `exhibition-${trialOrdinal}`,
    seed,
    objectives: [
      { family: "time", committedThreshold: round3(timeThreshold), description: "Beat the scheduled lap time" },
      { family: "activation", committedThreshold: activationThreshold, description: "Fire the committed item activations" },
      { family: "demand", committedThreshold: demandThreshold, description: "Meet the circuit's characteristic demand" },
    ],
  };
}

/** Evaluates retained contest evidence against the committed thresholds (T054). */
export function evaluateExhibitionResult(
  trial: ExhibitionTrial,
  evidence: ExhibitionContestEvidence,
): ExhibitionResult {
  const outcomes: ExhibitionObjectiveOutcome[] = trial.objectives.map((objective) => {
    const actual =
      objective.family === "time"
        ? evidence.fastestLapTime
        : objective.family === "activation"
          ? evidence.itemActivations
          : evidence.demandScore;
    const completed =
      objective.family === "time"
        ? evidence.fastestLapTime <= objective.committedThreshold
        : actual >= objective.committedThreshold;
    return { family: objective.family, completed, actual, threshold: objective.committedThreshold };
  });

  const perFamily: Record<ExhibitionObjectiveFamily, boolean> = {
    time: false,
    activation: false,
    demand: false,
  };
  outcomes.forEach((outcome) => {
    perFamily[outcome.family] = outcome.completed;
  });
  const completedCount = Object.values(perFamily).filter(Boolean).length as 0 | 1 | 2 | 3;

  return {
    trialId: trial.trialId,
    score: completedCount,
    reputationAward: completedCount,
    completedCount,
    objectives: outcomes,
    championshipUnchanged: true,
  };
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
