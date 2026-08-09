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
import { SAMPLE_GHOST } from "../content/sample-data";
import type { CarProgress } from "../simulation/playback";
import type { ContestResult, SampleGhost } from "../simulation/types";
import type { RandomSource } from "../simulation/encounters";
import type {
  PartsSupplierPayload,
  SponsorMeetingPayload,
} from "../simulation/encounters";

export type RunSceneRoute = "RunScene" | "PrepareScene" | "ContestScene";

export interface RunPresentation {
  progressLabel: string;
  creditsLabel: string;
  status: Run["status"];
  choices: EncounterChoice[];
  remainingStages: number;
  pendingSponsorLabel: string | null;
  statusLabel: "Available" | "Active" | "Completed" | "Unavailable";
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
  identityTag?: string;
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
  return {
    progressLabel: run.status === "completed"
      ? "Run complete"
      : `Stage ${run.stageIndex + 1} of ${run.stages.length}`,
    creditsLabel: `${run.credits} credits`,
    status: run.status,
    choices: run.availableChoices,
    remainingStages: progress.remaining,
    pendingSponsorLabel: run.activeSponsorContract
      ? `Pending sponsor: ${sponsorObjectiveLabel(run.activeSponsorContract.objective)} on the next race for 7 credits`
      : null,
    statusLabel: run.status === "unavailable"
      ? "Unavailable"
      : run.status === "completed"
        ? "Completed"
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
  return `trigger ${objective.identityTag} items ${objective.requiredEvents} times`;
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
            identityTag: option.objective.identityTag,
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
  lapCount: 10 | 12;
  build: Run["build"];
  ghost: SampleGhost;
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
  return {
    run,
    encounterId,
    lapCount: encounter.payload.lapCount,
    build: encounter.payload.buildSnapshot,
    ghost: SAMPLE_GHOST,
  };
}

export function continueRunFromResult(
  run: Run,
  encounterId: string,
  result: ContestResult,
  rng: RandomSource = Math.random,
): Run {
  return completePvpEncounter(run, encounterId, result, rng);
}

export function raceLapLabel(name: string, progress: CarProgress, lapCount: number): string {
  return progress.finished
    ? `${name} · FINISHED`
    : `${name} · LAP ${Math.min(progress.lapIndex + 1, lapCount)}/${lapCount}`;
}

export function runRoute(run: Run): RunSceneRoute {
  if (run.activeEncounter?.type === "pvp") return "ContestScene";
  if (
    run.activeEncounter?.type === "parts-supplier" ||
    run.activeEncounter?.type === "reward-draft"
  ) {
    return "PrepareScene";
  }
  return "RunScene";
}