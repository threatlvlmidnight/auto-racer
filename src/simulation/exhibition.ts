import { identityForEntrant } from "../content/driverRaceIdentities";
import { simulatePlayerLaps } from "./laps";
import { computePhaseSchedule, createComposureLedger, racePhaseForLap } from "./raceEnrichment";
import { installedItems, storedItems } from "./slots";
import { generateTrack, summarizeTrack } from "./tracks";
import type { Build, EnrichedContestResult, EntrantId, RegionId } from "./types";

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

export interface SoloExhibitionContestInput {
  build: Build;
  entrantId: EntrantId;
  seed: number;
  level: number;
  lapCount: number;
  regionTheme?: RegionId;
}

/**
 * Resolves an Exhibition through the normal retained N-car playback contract,
 * but with exactly one player car and no rivals, attacks, incidents, or race
 * settlement. ContestScene and ResultScene can therefore reuse their normal
 * track, playback, audio, evidence, and controls without presenting Test Day.
 */
export function resolveSoloExhibitionContest(input: SoloExhibitionContestInput): EnrichedContestResult {
  const track = generateTrack(input.seed, input.level, input.regionTheme);
  const laps = simulatePlayerLaps(input.build, input.lapCount, track);
  const identity = identityForEntrant(input.entrantId);
  if (!identity) throw new RangeError(`Unknown Exhibition entrant: ${input.entrantId}`);
  const phaseSchedule = computePhaseSchedule(input.lapCount);
  const time = laps.reduce((sum, lap) => sum + lap.time, 0);
  const ledger = createComposureLedger("player", 0);
  const player = {
    id: "player",
    role: "player" as const,
    name: "Player",
    color: "#ffd447",
    time,
    laps,
    position: 1,
    gapToLeader: 0,
    driverIdentity: identity,
    composureLedger: ledger,
    enrichedLaps: laps.map((lap, index) => ({
      lap: index + 1,
      phase: racePhaseForLap(phaseSchedule, index + 1),
      baseTime: lap.time,
      enrichedTime: lap.time,
      incidentTimeLoss: 0,
    })),
  };
  return {
    lapCount: input.lapCount,
    cars: [player],
    outcome: "win",
    board: installedItems(input.build).filter((item): item is NonNullable<typeof item> => item !== null),
    storage: storedItems(input.build).filter((item): item is NonNullable<typeof item> => item !== null),
    track,
    tieBreakOrder: ["player"],
    configVersion: "exhibition-solo-v1",
    phaseSchedule,
    events: [],
    incidentsEnabled: false,
    driverIdentities: { player: identity },
    eligibility: [],
  };
}

/** Derives the three objective inputs from the retained solo result only. */
export function exhibitionEvidenceFromResult(result: EnrichedContestResult): ExhibitionContestEvidence {
  const player = result.cars.find((car) => car.role === "player");
  if (!player || player.laps.length === 0) {
    return { fastestLapTime: Number.POSITIVE_INFINITY, itemActivations: 0, demandScore: 0 };
  }
  const summary = summarizeTrack(result.track, result.lapCount);
  const finalStats = player.laps[player.laps.length - 1].physics?.stats;
  const demandScore = finalStats
    ? Math.round([
        [summary.demands.power, finalStats.topSpeed],
        [summary.demands.braking, finalStats.brakingPower],
        [summary.demands.cornering, finalStats.corneringSpeed],
      ].reduce((sum, [demand, vehicle]) => sum + Math.max(0, 100 - Math.abs(demand - vehicle)), 0) / 3)
    : 0;
  return {
    fastestLapTime: Math.min(...player.laps.map((lap) => lap.time)),
    itemActivations: player.laps.reduce((sum, lap) => sum + lap.firedItems.length, 0),
    demandScore,
  };
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
