import type {
  EncounterChoice,
  Run,
  RunHistorySummary,
  SponsorObjective,
} from "../simulation/run";
import {
  completePvpEncounter,
  runProgress,
  RunTransitionError,
  summarizeRunHistory,
} from "../simulation/run";
import { GHOST_POOL, RIVAL_PROFILES } from "../content/rivals";
import { selectGhostRoster } from "../simulation/rivals";
import { localRivalRoster } from "../simulation/localOpponents";
import type { CarProgress } from "../simulation/playback";
import type { ContestResult, HistoryCircuitEvidence, NCarContestResult, RivalProfile } from "../simulation/types";
import type { RandomSource } from "../simulation/encounters";
import {
  circuitPresentationIdentity,
  type CircuitPresentationIdentity,
} from "./circuitPresentation";
import type {
  PartsSupplierPayload,
  SponsorMeetingPayload,
} from "../simulation/encounters";

export type RunSceneRoute = "RunScene" | "PrepareScene" | "ContestScene";

export interface RunPresentation {
  progressLabel: string;
  creditsLabel: string;
  /** Feature 015: always visible alongside credits (FR-006). */
  reputationLabel: string;
  status: Run["status"];
  choices: EncounterChoice[];
  remainingStages: number;
  pendingSponsorLabel: string | null;
  statusLabel: "Available" | "Active" | "Completed" | "Unavailable" | "Failed";
  history: RunHistorySummary[];
}

export interface StockPresentation {
  id: string;
  itemId: string;
  price: number;
  affordable: boolean;
  purchased: boolean;
}

export interface SponsorOptionPresentation {
  id: string;
  kind: "immediate" | "win-next-race" | "target-race-time" | "trigger-tagged-items";
  payout: 2 | 7;
  targetSeconds?: number;
  tag?: string;
  requiredEvents?: number;
}

export interface ActiveEncounterPresentation {
  type: Run["activeEncounter"] extends { type: infer Type } ? Type : string;
  credits: number;
  stock?: StockPresentation[];
  unavailable?: boolean;
  restockCost?: 1;
  restockAvailable?: boolean;
  sponsorOptions?: SponsorOptionPresentation[];
}

export function runPresentation(run: Run): RunPresentation {
  const progress = runProgress(run);
  const tourActive = Boolean(run.worldTour && (run.worldTour.selectedRegions.length > 0 || run.worldTour.phase === "completed"));
  const totalStages = tourActive ? 40 : run.stages.length;
  return {
    progressLabel: run.status === "completed"
      ? "Run complete"
      : run.status === "failed"
        ? "Run failed"
        : `Stage ${Math.min(totalStages, run.stageIndex + 1)} of ${totalStages}`,
    creditsLabel: `${run.credits} credits`,
    reputationLabel: `${run.reputation} reputation`,
    status: run.status,
    choices: run.availableChoices,
    remainingStages: tourActive ? Math.max(0, 40 - run.stageIndex) : progress.remaining,
    pendingSponsorLabel: run.activeSponsorContract
      ? `Pending sponsor: ${sponsorObjectiveLabel(run.activeSponsorContract.objective)} ${run.activeSponsorContract.objective.kind === "trigger-tagged-items" ? "during either race type" : "in the next Championship Race"} for 7 credits`
      : null,
    statusLabel: run.status === "unavailable"
      ? "Unavailable"
      : run.status === "completed"
        ? "Completed"
        : run.status === "failed"
          ? "Failed"
          : run.activeEncounter
            ? "Active"
            : "Available",
    history: summarizeRunHistory(run),
  };
}

function sponsorObjectiveLabel(objective: SponsorObjective): string {
  if (objective.kind === "win-next-race") return "win";
  if (objective.kind === "target-race-time") {
    return `finish in ${objective.targetSeconds}s or less`;
  }
  return `trigger ${objective.tag} items ${objective.requiredEvents} times`;
}

export function activeEncounterPresentation(run: Run): ActiveEncounterPresentation | null {
  const encounter = run.activeEncounter;
  if (!encounter) return null;

  if (encounter.type === "parts-supplier") {
    const payload = encounter.payload as PartsSupplierPayload;
    return {
      type: encounter.type,
      credits: run.credits,
      stock: payload.stock.map((entry) => ({
        id: entry.id,
        itemId: entry.item.id,
        price: entry.item.price,
        affordable: entry.state === "available" && entry.item.price <= run.credits,
        purchased: entry.state === "purchased",
      })),
      unavailable: payload.unavailable,
      restockCost: 1,
      restockAvailable: !payload.unavailable && !payload.restockUsed && run.credits >= 1,
    };
  }

  if (encounter.type === "sponsor-meeting") {
    const payload = encounter.payload as SponsorMeetingPayload;
    return {
      type: encounter.type,
      credits: run.credits,
      sponsorOptions: payload.options.map((option) => {
        if (option.kind === "immediate") {
          return { id: option.id, kind: option.kind, payout: option.payout };
        }
        if (option.objective.kind === "target-race-time") {
          return {
            id: option.id,
            kind: option.kind,
            payout: option.payout,
            targetSeconds: option.objective.targetSeconds,
          };
        }
        if (option.objective.kind === "trigger-tagged-items") {
          return {
            id: option.id,
            kind: option.kind,
            payout: option.payout,
            tag: option.objective.tag,
            requiredEvents: option.objective.requiredEvents,
          };
        }
        return { id: option.id, kind: option.kind, payout: option.payout };
      }),
    };
  }

  return { type: encounter.type, credits: run.credits };
}

export interface ContestSceneInput {
  run: Run;
  encounterId: string;
  lapCount: 8 | 10 | 12 | 14 | 16;
  build: Run["build"];
  /** Exactly 7 rival profiles; identical for every entrant (FR-010). */
  rivalRoster: readonly RivalProfile[];
  /** The current scheduled PvP stage's ordinal (data-model.md "in-run level"). */
  level: number;
  seed: number;
  raceKind: "local" | "championship";
  regionId?: import("../simulation/types").RegionId;
  localRaceTier?: import("../simulation/types").LocalRaceTier;
  legOrdinal?: 1 | 2 | 3 | 4 | 5;
  eliteFinale: boolean;
}

export function contestSceneInput(run: Run, encounterId: string): ContestSceneInput {
  const encounter = run.activeEncounter;
  if (
    run.status !== "active" ||
    !encounter ||
    encounter.id !== encounterId ||
    encounter.type !== "pvp" ||
    encounter.payload.kind !== "pvp"
  ) {
    throw new RunTransitionError("encounter-id-mismatch", `${encounterId} is not active PvP`);
  }
  const stage = run.stages.find((candidate) => candidate.id === encounter.stageId);
  const level = stage?.pvpOrdinal ?? 1;
  const activeTourLeg = run.worldTour?.legs[run.worldTour.legs.length - 1];
  const worldTourRoster = stage?.raceKind === "local" && stage.regionId && stage.localRaceTier && activeTourLeg
    ? localRivalRoster(stage.regionId, stage.localRaceTier, activeTourLeg.ordinal)
    : RIVAL_PROFILES;
  return {
    run,
    encounterId,
    lapCount: encounter.payload.lapCount,
    build: encounter.payload.buildSnapshot,
    // 019-async-ghost-pool: a deterministic 7-car selection from the wider
    // GHOST_POOL, replacing the always-identical fixed RIVAL_PROFILES roster.
    rivalRoster: run.worldTour?.selectedRegions.length
      ? worldTourRoster
      : selectGhostRoster(GHOST_POOL, run.seed, level),
    level,
    seed: run.seed,
    raceKind: stage?.raceKind ?? "championship",
    regionId: stage?.regionId,
    localRaceTier: stage?.localRaceTier,
    legOrdinal: activeTourLeg?.ordinal,
    eliteFinale: stage?.championshipRaceOrdinal === 10 && run.worldTour?.finaleMode === "elite",
  };
}

/**
 * Bridges the rich N-car result back to the legacy two-sided ContestResult
 * that completePvpEncounter/resolvePendingSponsor still expect
 * (012-multi-ghost-contest deliberately leaves run.ts/encounters.ts
 * untouched — see specs/012-multi-ghost-contest/plan.md's file list and
 * research.md Decision 6). "ghost"/"gap" become the player's gap to their
 * nearest competitor: the car one rank above the player, or one rank below
 * if the player is already leading.
 */
export function toLegacyContestResult(result: NCarContestResult): ContestResult {
  const player = result.cars.find((car) => car.role === "player")!;
  const nearestRank = player.position === 1 ? 2 : player.position - 1;
  const nearest = result.cars.find((car) => car.position === nearestRank) ?? player;

  const enriched = result as import("../simulation/types").EnrichedContestResult;
  const enrichment = enriched.events
    ? {
      configVersion: enriched.configVersion,
      phaseSchedule: enriched.phaseSchedule,
      events: enriched.events,
      incidentsEnabled: enriched.incidentsEnabled,
      eligibility: enriched.eligibility,
      ledgers: Object.fromEntries(enriched.cars.map((car) => [car.id, car.composureLedger])),
    }
    : undefined;
  return {
    lapCount: result.lapCount,
    playerTime: player.time,
    ghostTime: nearest.time,
    gap: player.time - nearest.time,
    outcome: result.outcome,
    board: result.board,
    storage: result.storage,
    laps: player.laps.map((lap, index) => ({
      lap: index + 1,
      playerLapTime: lap.time,
      ghostLapTime: nearest.laps[index]?.time ?? lap.time,
      firedItems: lap.firedItems,
      contributions: lap.contributions,
      // 021-arcade-physics-simulation: forwarded explicitly — this mapping
      // does not auto-forward new PlayerLap fields; trackFit had the same
      // gap, undiscovered until /speckit.analyze (finding I1).
      physics: lap.physics,
    })),
    contributions: player.laps.flatMap((lap) => lap.contributions),
    playerPosition: player.position,
    finishingOrder: result.cars.map((car) => car.role === "player" ? "player" : car.id),
    enrichment,
    circuit: { trackId: result.track.id, trackName: result.track.name },
  };
}

export function continueRunFromResult(
  run: Run,
  encounterId: string,
  result: NCarContestResult,
  rng: RandomSource = Math.random,
): Run {
  return completePvpEncounter(run, encounterId, toLegacyContestResult(result), rng);
}

export function raceLapLabel(name: string, progress: CarProgress, lapCount: number): string {
  return progress.finished
    ? `${name} · FINISHED`
    : `${name} · LAP ${Math.min(progress.lapIndex + 1, lapCount)}/${lapCount}`;
}

/**
 * Feature 035 US1: project the exact retained circuit identity onto a
 * completed scored-race history summary. Returns null when the history entry
 * carries no circuit evidence (legacy/non-scored). Consumes retained facts
 * only — never regenerates or infers a track from a seed.
 */
export function historyCircuitFacts(summary: RunHistorySummary): CircuitPresentationIdentity | null {
  const evidence = summary.pvp?.circuit as HistoryCircuitEvidence | undefined;
  if (!evidence) return null;
  return circuitPresentationIdentity(
    { id: evidence.trackId, name: evidence.trackName },
    { regionId: evidence.regionId },
  );
}

/** Direct scored-race identity from a resolved track + current stage context. */
export function resolvedCircuitIdentity(
  track: Pick<import("../simulation/tracks").Track, "id" | "name"> | undefined | null,
  stage: { regionId?: import("../simulation/types").RegionId; raceKind?: import("../simulation/types").RaceKind } | null,
): CircuitPresentationIdentity {
  return circuitPresentationIdentity(track, stage);
}

export function runRoute(run: Run): RunSceneRoute {
  if (run.activeEncounter?.type === "pvp") return "ContestScene";
  if (
    run.activeEncounter?.type === "parts-supplier" ||
    run.activeEncounter?.type === "reward-draft" ||
    run.activeEncounter?.type === "cross-pollination"
  ) {
    return "PrepareScene";
  }
  return "RunScene";
}
