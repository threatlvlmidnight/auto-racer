import { entrantById, vehicleById } from "../content/entrants";
import { RIVAL_PROFILES } from "../content/rivals";
import { BASELINE_CAR } from "../content/sample-data";
import {
  generateEncounterChoices,
  resolvePendingSponsor,
  type RandomSource,
} from "./encounters";
import { createEmptyVehicleBuild } from "./build";
import {
  completeCurrentTourLeg,
  confirmWorldTourDestination,
  createWorldTourState,
  validateWorldTourCompatibility,
} from "./championship";
import { installedItems, storedItems } from "./slots";
import { settleWorldTourReputation, WORLD_TOUR_REPUTATION_START } from "./reputation";
import { raceSettlementPolicy } from "./settlement";
import {
  applyChampionshipResult,
  createStandings,
  qualifiesForEliteFinale,
} from "./standings";
import {
  ACTIVE_IDENTITY_TAG,
  VEHICLE_STORAGE_CAPACITY,
  type Build,
  type ContestOutcome,
  type ContestResult,
  type EntrantId,
  type IdentityTag,
  type OfferedItem,
  type RunIdentity,
  type RunSetupMemory,
  type LocalRaceTier,
  type RaceKind,
  type SelectableRegionId,
  type TourLeg,
  type VehicleBuild,
  type WorldTourState,
} from "./types";

/** The immutable entrant/vehicle association for a run, or undefined if unknown. */
export function runIdentityForEntrant(entrantId: EntrantId): RunIdentity | undefined {
  const entrant = entrantById(entrantId);
  if (!entrant) return undefined;
  const vehicle = vehicleById(entrant.vehicleId);
  if (!vehicle || vehicle.entrantId !== entrantId) return undefined;
  return {
    entrantId,
    origin: entrant.origin,
    vehicleId: vehicle.id,
    topologyId: `${vehicle.id}-topology-v1`,
  };
}

export type RunBuildContextCode =
  | "missing-run-identity"
  | "invalid-entrant-context"
  | "invalid-build-context"
  | "invalid-vehicle-topology"
  | "legacy-generic-board";

export type RunBuildContextResult =
  | { kind: "valid" }
  | { kind: "unavailable"; code: RunBuildContextCode };

/**
 * Validates that a run's identity and build still agree with authored content.
 * Returns a typed unavailable result rather than repairing, defaulting, or
 * guessing — stale in-memory shape (including the pre-feature-010 generic
 * `board` array) must route to recovery, never to a silently migrated build.
 */
export function validateRunBuildContext(
  identity: RunIdentity | null | undefined,
  build: VehicleBuild | null | undefined,
): RunBuildContextResult {
  const unavailable = (code: RunBuildContextCode) => ({ kind: "unavailable", code }) as const;

  if (!identity) return unavailable("missing-run-identity");
  if (!build || typeof build !== "object") return unavailable("invalid-build-context");

  // Stale pre-migration shape: a generic board array with no typed topology.
  const legacy = build as unknown as { board?: unknown };
  if (Array.isArray(legacy.board) && !Array.isArray(build.slots)) {
    return unavailable("legacy-generic-board");
  }

  const entrant = entrantById(identity.entrantId);
  const vehicle = vehicleById(identity.vehicleId);
  if (!entrant || !vehicle) return unavailable("invalid-entrant-context");
  if (entrant.vehicleId !== identity.vehicleId || vehicle.entrantId !== identity.entrantId) {
    return unavailable("invalid-entrant-context");
  }
  if (entrant.origin !== identity.origin) return unavailable("invalid-entrant-context");

  if (build.vehicleId !== identity.vehicleId) return unavailable("invalid-build-context");
  if (!Array.isArray(build.slots) || !Array.isArray(build.storage)) {
    return unavailable("invalid-build-context");
  }

  if (build.slots.length !== vehicle.slots.length) return unavailable("invalid-vehicle-topology");
  const topologyMatches = build.slots.every((slot, index) =>
    slot.slotId === vehicle.slots[index].id && slot.slotType === vehicle.slots[index].type);
  if (!topologyMatches) return unavailable("invalid-vehicle-topology");
  if (build.storage.length !== VEHICLE_STORAGE_CAPACITY) {
    return unavailable("invalid-vehicle-topology");
  }

  if (build.car?.id !== BASELINE_CAR.id || build.car.baseLapTime !== BASELINE_CAR.baseLapTime) {
    return unavailable("invalid-build-context");
  }

  return { kind: "valid" };
}

export type RunStatus = "active" | "completed" | "unavailable" | "failed";

/**
 * Balance-pass placeholder (015-economy-depth spec.md Assumptions, rescaled
 * per chat follow-up): exact value is a tuning decision, not fixed by the
 * spec. Chosen so a run that finishes mid-pack (position 4-5) across a
 * couple of PvP stages can plausibly still fail before Stage 6, without
 * every below-average run failing automatically.
 */
export const REPUTATION_START = 6;

/**
 * Position-based reputation delta (015-economy-depth, chat follow-up):
 * podium finishes (1-3) gain reputation, back-of-field finishes (5-8) lose
 * it, and 4th is neutral. Keyed by the player's live 1-8 finishing
 * position — see ContestResult.playerPosition.
 */
const POSITION_REPUTATION_DELTA: Record<number, number> = {
  1: 3,
  2: 2,
  3: 1,
  4: 0,
  5: -1,
  6: -2,
  7: -3,
  8: -4,
};

/**
 * Flat penalty applied on a failed sponsor objective, independent of race
 * position (015-economy-depth FR-002, research.md Decision 2).
 */
const SPONSOR_FAILURE_REPUTATION_DELTA = -1;

/**
 * Legacy 2-car resolveContest(build, ghost, lapCount) calls have no 1-8
 * position — only a win/tie/loss outcome. Maps that outcome onto the same
 * position-delta table so both paths share one reputation calculation.
 */
const LEGACY_OUTCOME_POSITION: Record<ContestOutcome, number> = {
  win: 1,
  tie: 4,
  loss: 8,
};

/** Looks up the position-based reputation delta (015-economy-depth). */
export function reputationDeltaForPosition(position: number): number {
  return POSITION_REPUTATION_DELTA[position] ?? 0;
}

/**
 * Balance-pass placeholder (Assumptions): not fixed by the spec. Chosen so
 * interest stays a no-op for a run's typical early single-digit balance
 * (matching zero regression in every existing low-credit test) while
 * becoming real once a player actually banks a double-digit reserve.
 */
const INTEREST_RATE = 0.1;

/** Pure (contract §2): amount derived only from the current balance. */
export function interestFor(bankedCredits: number): number {
  return Math.floor(bankedCredits * INTEREST_RATE);
}
export type StageState = "unavailable" | "available" | "active" | "completed";
export type EncounterType =
  | "parts-supplier"
  | "reward-draft"
  | "cross-pollination"
  | "sponsor-meeting"
  | "pvp";
export type NonPvpEncounterType = Exclude<EncounterType, "pvp">;

export interface RunStage {
  id: string;
  position: number;
  kind: "choice" | "pvp";
  choiceOrdinal?: number;
  pvpOrdinal?: number;
  lapCount?: 8 | 10 | 12 | 14 | 16;
  raceKind?: RaceKind;
  localRaceTier?: LocalRaceTier;
  regionId?: TourLeg["regionId"];
  state: StageState;
}

export interface EncounterChoice {
  id: string;
  stageId: string;
  type: NonPvpEncounterType;
  summary: string;
}

export interface PvpPayload {
  kind: "pvp";
  lapCount: 8 | 10 | 12 | 14 | 16;
  raceKind?: RaceKind;
  buildSnapshot: Build;
  result?: ContestResult;
}

export interface PendingEncounterPayload {
  kind: NonPvpEncounterType;
}

export type EncounterPayload = PvpPayload | PendingEncounterPayload;

export interface ActiveEncounter {
  id: string;
  stageId: string;
  type: EncounterType;
  status: "active" | "completed";
  payload: EncounterPayload;
}

export type CreditTransactionKind =
  | "purchase"
  | "restock"
  | "participation"
  | "win-bonus"
  | "sponsor-immediate"
  | "sponsor-conditional"
  | "interest"
  | "sell-back"
  | "duplicate-conversion";

export interface CreditTransaction {
  id: string;
  encounterId: string;
  kind: CreditTransactionKind;
  amount: number;
  balanceAfter: number;
}

export type SponsorObjective =
  | { kind: "win-next-race" }
  | { kind: "target-race-time"; targetSeconds: number }
  | { kind: "trigger-tagged-items"; tag: string; requiredEvents: 10 };

/**
 * 020-character-item-pools: the small authored set `objectiveForKind`
 * (encounters.ts) selects a `"trigger-tagged-items"` `tag` from, via the
 * same `rng` every other encounter branch already threads through — never a
 * single fixed value (research.md Decision 4). Every entry MUST match at
 * least one `Buff`-role item somewhere in the full item catalog, checked by
 * `validateItemPools` (itemPools.ts), so the objective is never authored
 * unwinnable by construction.
 */
export const SPONSOR_OBJECTIVE_TAGS: readonly string[] = ["information", "momentum"];

export interface SponsorContract {
  id: string;
  sourceEncounterId: string;
  objective: SponsorObjective;
  payout: 7;
  status: "pending" | "succeeded" | "failed";
  resolvedEncounterId?: string;
  actual?: number | string;
}

export interface AcquisitionOutcome {
  kind: string;
  itemIds?: string[];
  restocked?: boolean;
}

export interface RunHistoryEntry {
  encounterId: string;
  stagePosition: number;
  type: EncounterType;
  acquisitionOutcome?: AcquisitionOutcome;
  creditTransactionIds: string[];
  pvpOutcome?: {
    outcome: ContestResult["outcome"];
    lapCount: number;
    playerTime: number;
    ghostTime: number;
    gap: number;
  };
  sponsorOutcome?: SponsorContract;
}

export interface Run {
  id: string;
  seed: number;
  identityTag: IdentityTag;
  /** Immutable entrant/vehicle/topology association (feature 010). */
  identity: RunIdentity;
  status: RunStatus;
  stageIndex: number;
  stages: RunStage[];
  availableChoices: EncounterChoice[];
  activeEncounter: ActiveEncounter | null;
  build: Build;
  credits: number;
  creditTransactions: CreditTransaction[];
  activeSponsorContract: SponsorContract | null;
  history: RunHistoryEntry[];
  /** New (015-economy-depth FR-001). Floored at 0 — never negative (FR-004). */
  reputation: number;
  /**
   * 028-pre-race-setup: championship-local "Remember setup" state. Absent is
   * equivalent to `{ enabled: false, selections: {} }` — every existing
   * fixture/run predating this feature stays valid without migration
   * (contract §7, data-model.md "Draft and remembered state").
   */
  setupMemory?: RunSetupMemory;
  /**
   * Feature 029 authoritative schedule state. Absent means the active run uses
   * an incompatible legacy championship schedule and must be restarted; it is
   * never inferred from the old flat `stages` array.
   */
  worldTour?: WorldTourState;
}

export type RunTransitionErrorCode =
  | "run-not-active"
  | "encounter-id-mismatch"
  | "encounter-already-completed"
  | "invalid-encounter-type"
  | "invalid-action"
  | "insufficient-credits"
  | "race-result-mismatch";

export class RunTransitionError extends Error {
  constructor(
    public readonly code: RunTransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RunTransitionError";
  }
}

export interface CreateRunInput {
  runId: string;
  seed: number;
  identityTag: IdentityTag;
  identity: RunIdentity;
  build: Build;
  rng: RandomSource;
}

export interface RunProgress {
  current: number;
  total: number;
  remaining: number;
  status: RunStatus;
}

export interface RunHistorySummary {
  encounterId: string;
  stagePosition: number;
  type: EncounterType;
  acquisition?: AcquisitionOutcome;
  transactions: Pick<CreditTransaction, "kind" | "amount" | "balanceAfter">[];
  pvp?: RunHistoryEntry["pvpOutcome"];
  sponsor?: {
    kind: SponsorObjective["kind"];
    status: SponsorContract["status"];
    actual?: number | string;
    required?: number;
    targetSeconds?: number;
    payout: number;
  };
}

export const stageId = (runId: string, position: number) => `${runId}-stage-${position}`;
export const encounterId = (choiceId: string) => `${choiceId}-encounter`;

function createStages(runId: string): RunStage[] {
  const definitions: Pick<RunStage, "kind" | "choiceOrdinal" | "pvpOrdinal" | "lapCount">[] = [
    { kind: "choice", choiceOrdinal: 1 },
    { kind: "choice", choiceOrdinal: 2 },
    { kind: "pvp", pvpOrdinal: 1, lapCount: 10 },
    { kind: "choice", choiceOrdinal: 3 },
    { kind: "choice", choiceOrdinal: 4 },
    { kind: "pvp", pvpOrdinal: 2, lapCount: 12 },
    { kind: "choice", choiceOrdinal: 5 },
    { kind: "choice", choiceOrdinal: 6 },
    { kind: "pvp", pvpOrdinal: 3, lapCount: 14 },
    { kind: "choice", choiceOrdinal: 7 },
    { kind: "choice", choiceOrdinal: 8 },
    { kind: "pvp", pvpOrdinal: 4, lapCount: 16 },
  ];
  return definitions.map((definition, index) => ({
    ...definition,
    id: stageId(runId, index + 1),
    position: index + 1,
    state: index === 0 ? "available" : "unavailable",
  }));
}

export function createRun(input: CreateRunInput): Run {
  const run: Run = {
    id: input.runId,
    seed: input.seed,
    identityTag: input.identityTag,
    identity: input.identity,
    status: "active",
    stageIndex: 0,
    stages: createStages(input.runId),
    availableChoices: [],
    activeEncounter: null,
    build: input.build,
    credits: 5,
    creditTransactions: [],
    activeSponsorContract: null,
    history: [],
    reputation: REPUTATION_START,
    worldTour: createWorldTourState(input.seed),
  };
  return { ...run, availableChoices: generateEncounterChoices(run, input.rng) };
}

function runStagesForTourLeg(runId: string, leg: TourLeg, existingStageCount: number): RunStage[] {
  let choiceOrdinal = existingStageCount - Math.floor(existingStageCount / 2) + 1;
  return leg.stages.map((stage, index) => {
    const kind = stage.kind === "race" ? "pvp" as const : "choice" as const;
    const mapped: RunStage = {
      id: `${runId}-stage-${existingStageCount + index + 1}`,
      position: existingStageCount + index + 1,
      kind,
      state: index === 0 ? "available" : "unavailable",
      regionId: stage.regionId,
    };
    if (kind === "choice") mapped.choiceOrdinal = choiceOrdinal++;
    else {
      mapped.pvpOrdinal = stage.championshipRaceOrdinal;
      mapped.lapCount = stage.lapCount;
      mapped.raceKind = stage.raceKind;
      mapped.localRaceTier = stage.localRaceTier;
    }
    return mapped;
  });
}

export function confirmRunDestination(
  run: Run,
  selected: SelectableRegionId,
  rng: RandomSource,
): Run {
  assertActive(run);
  if (!run.worldTour) throw new RunTransitionError("invalid-action", "The run has no world-tour state");
  const worldTour = confirmWorldTourDestination(run.id, run.worldTour, selected);
  const initializedWorldTour = worldTour.standings.length === 0
    ? {
        ...worldTour,
        championshipRivals: RIVAL_PROFILES.map((profile, stableOrder) => ({
          entrantId: profile.id,
          stableOrder: stableOrder + 1,
          championshipFinishes: [],
        })),
        standings: createStandings([
          run.identity.entrantId,
          ...RIVAL_PROFILES.map((profile) => profile.id),
        ]),
      }
    : worldTour;
  const existingStages = initializedWorldTour.legs.length === 1 ? [] : run.stages;
  const leg = initializedWorldTour.legs[initializedWorldTour.legs.length - 1];
  const appended = runStagesForTourLeg(run.id, leg, existingStages.length);
  const stages = [...existingStages, ...appended];
  const stageIndex = existingStages.length;
  const next: Run = {
    ...run,
    worldTour: initializedWorldTour,
    stages,
    stageIndex,
    availableChoices: [],
    activeEncounter: null,
  };
  return { ...next, availableChoices: generateEncounterChoices(next, rng) };
}

export type RunScheduleCompatibility = ReturnType<typeof validateWorldTourCompatibility>;

export function validateRunScheduleCompatibility(run: Pick<Run, "worldTour">): RunScheduleCompatibility {
  return validateWorldTourCompatibility(run.worldTour);
}

export type EntrantSelectionGuardResult =
  | { kind: "allowed" }
  | { kind: "blocked"; code: "active-run-exists" };

/**
 * Caller-owned active-run protection (contract §2). Route/controller code must
 * narrow this to `allowed` before calling `createRunForEntrant`; run creation
 * itself deliberately receives no global active-run context so it stays pure.
 */
export function canEnterEntrantSelection(activeRun: Run | null | undefined): EntrantSelectionGuardResult {
  return activeRun && activeRun.status === "active"
    ? { kind: "blocked", code: "active-run-exists" }
    : { kind: "allowed" };
}

export interface ConfirmEntrantInput {
  entrantId: EntrantId;
  runId: string;
  seed: number;
  rng: RandomSource;
}

export type RunCreationValidationCode =
  | "entrant-unavailable"
  | "invalid-roster-pairing"
  | "invalid-vehicle-topology";

export type CreateRunForEntrantResult =
  | { kind: "created"; run: Run }
  | { kind: "validation-failure"; code: RunCreationValidationCode };

/**
 * The only way a run comes into existence. Pure: validates the entrant/content
 * pairing and topology, then builds the run. Expected invalid input returns a
 * typed failure rather than throwing or falling back to a default entrant.
 */
export function createRunForEntrant(input: ConfirmEntrantInput): CreateRunForEntrantResult {
  const entrant = entrantById(input.entrantId);
  if (!entrant) return { kind: "validation-failure", code: "entrant-unavailable" };

  const vehicle = vehicleById(entrant.vehicleId);
  if (!vehicle || vehicle.entrantId !== entrant.id) {
    return { kind: "validation-failure", code: "invalid-roster-pairing" };
  }

  const identity = runIdentityForEntrant(input.entrantId);
  if (!identity) return { kind: "validation-failure", code: "invalid-roster-pairing" };

  let build: VehicleBuild;
  try {
    build = createEmptyVehicleBuild(identity.vehicleId);
  } catch {
    return { kind: "validation-failure", code: "invalid-vehicle-topology" };
  }

  if (validateRunBuildContext(identity, build).kind !== "valid") {
    return { kind: "validation-failure", code: "invalid-vehicle-topology" };
  }

  return {
    kind: "created",
    run: {
      ...createRun({
      runId: input.runId,
      seed: input.seed,
      identityTag: ACTIVE_IDENTITY_TAG,
      identity,
      build,
      rng: input.rng,
      }),
      reputation: WORLD_TOUR_REPUTATION_START,
    },
  };
}

export function createUnavailableRun(input: Omit<CreateRunInput, "rng">): Run {
  return {
    id: input.runId,
    seed: input.seed,
    identityTag: input.identityTag,
    identity: input.identity,
    status: "unavailable",
    stageIndex: 0,
    stages: createStages(input.runId).map((stage) => ({ ...stage, state: "unavailable" })),
    availableChoices: [],
    activeEncounter: null,
    build: input.build,
    credits: 0,
    creditTransactions: [],
    activeSponsorContract: null,
    history: [],
    reputation: 0,
  };
}

export function runProgress(run: Run): RunProgress {
  const total = run.stages.length;
  // "active" and "failed" both report how far the run got (stageIndex + 1);
  // a failed run deliberately shares that branch, not a default fallthrough.
  const current = run.status === "completed"
    ? total
    : run.status === "unavailable"
      ? 0
      : run.stageIndex + 1;
  return {
    current,
    total,
    remaining: Math.max(0, total - run.stageIndex),
    status: run.status,
  };
}

export function summarizeRunHistory(run: Run): RunHistorySummary[] {
  const transactions = new Map(run.creditTransactions.map((transaction) => [transaction.id, transaction]));
  return [...run.history]
    .sort((first, second) => first.stagePosition - second.stagePosition)
    .map((entry) => {
      const objective = entry.sponsorOutcome?.objective;
      return {
        encounterId: entry.encounterId,
        stagePosition: entry.stagePosition,
        type: entry.type,
        acquisition: entry.acquisitionOutcome,
        transactions: entry.creditTransactionIds.flatMap((id) => {
          const transaction = transactions.get(id);
          return transaction
            ? [{
                kind: transaction.kind,
                amount: transaction.amount,
                balanceAfter: transaction.balanceAfter,
              }]
            : [];
        }),
        pvp: entry.pvpOutcome,
        sponsor: entry.sponsorOutcome && objective
          ? {
              kind: objective.kind,
              status: entry.sponsorOutcome.status,
              actual: entry.sponsorOutcome.actual,
              required: objective.kind === "trigger-tagged-items" ? objective.requiredEvents : undefined,
              targetSeconds: objective.kind === "target-race-time" ? objective.targetSeconds : undefined,
              payout: entry.sponsorOutcome.status === "succeeded" ? entry.sponsorOutcome.payout : 0,
            }
          : undefined,
      };
    });
}

export function activateChoice(run: Run, choice: EncounterChoice): Run {
  assertActive(run);
  const stage = run.stages[run.stageIndex];
  if (stage.kind !== "choice") {
    throw new RunTransitionError("invalid-encounter-type", "A choice cannot activate at a PvP stage");
  }
  if (run.activeEncounter || !run.availableChoices.some(({ id }) => id === choice.id)) {
    throw new RunTransitionError("encounter-id-mismatch", `Choice ${choice.id} is not current`);
  }
  return {
    ...run,
    stages: run.stages.map((candidate, index) =>
      index === run.stageIndex ? { ...candidate, state: "active" } : candidate,
    ),
    availableChoices: [],
    activeEncounter: {
      id: encounterId(choice.id),
      stageId: stage.id,
      type: choice.type,
      status: "active",
      payload: { kind: choice.type },
    },
  };
}

export interface NonPvpCompletion {
  build: Build;
  acquisitionOutcome?: AcquisitionOutcome;
  creditTransactionIds?: string[];
}

export function completeNonPvpEncounter(
  run: Run,
  suppliedEncounterId: string,
  completion: NonPvpCompletion,
  rng: RandomSource,
): Run {
  assertActive(run);
  const stage = run.stages[run.stageIndex];
  if (stage.kind === "pvp") {
    throw new RunTransitionError("invalid-encounter-type", "PvP requires a race result");
  }
  if (run.history.some(({ encounterId: completedId }) => completedId === suppliedEncounterId)) {
    throw new RunTransitionError("encounter-already-completed", `${suppliedEncounterId} is complete`);
  }
  const active = run.activeEncounter;
  if (!active || active.id !== suppliedEncounterId || active.type === "pvp") {
    throw new RunTransitionError("encounter-id-mismatch", `${suppliedEncounterId} is not current`);
  }

  const historyEntry: RunHistoryEntry = {
    encounterId: active.id,
    stagePosition: stage.position,
    type: active.type,
    acquisitionOutcome: completion.acquisitionOutcome,
    creditTransactionIds: completion.creditTransactionIds ?? [],
  };
  return advanceRun(
    { ...run, build: completion.build, history: [...run.history, historyEntry] },
    rng,
  );
}

export function completePvpEncounter(
  run: Run,
  suppliedEncounterId: string,
  result: ContestResult,
  rng: RandomSource = () => 0,
): Run {
  assertActive(run);
  const stage = run.stages[run.stageIndex];
  const active = run.activeEncounter;
  if (!stage || stage.kind !== "pvp" || !active || active.type !== "pvp") {
    throw new RunTransitionError("invalid-encounter-type", "Current encounter is not PvP");
  }
  if (active.id !== suppliedEncounterId) {
    throw new RunTransitionError("encounter-id-mismatch", `${suppliedEncounterId} is not current`);
  }
  if (run.history.some(({ encounterId: completedId }) => completedId === suppliedEncounterId)) {
    throw new RunTransitionError("encounter-already-completed", `${suppliedEncounterId} is complete`);
  }

  const payload = active.payload as PvpPayload;
  const expectedBoardIds = compactItemIds(installedItems(payload.buildSnapshot));
  const expectedStorageIds = compactItemIds(storedItems(payload.buildSnapshot));
  const resultBoardIds = result.board.map(({ id }) => id);
  const resultStorageIds = result.storage.map(({ id }) => id);
  if (
    result.lapCount !== payload.lapCount ||
    !sameIds(resultBoardIds, expectedBoardIds) ||
    !sameIds(resultStorageIds, expectedStorageIds)
  ) {
    throw new RunTransitionError(
      "race-result-mismatch",
      `Race result does not match ${active.id}`,
    );
  }

  let credits = run.credits;
  let transactions = run.creditTransactions;
  const encounterTransactionIds: string[] = [];
  const appendTransaction = (kind: CreditTransactionKind, amount: number) => {
    credits += amount;
    const transaction: CreditTransaction = {
      id: `${active.id}-transaction-${encounterTransactionIds.length + 1}`,
      encounterId: active.id,
      kind,
      amount,
      balanceAfter: credits,
    };
    transactions = [...transactions, transaction];
    encounterTransactionIds.push(transaction.id);
  };

  const worldTourActive = Boolean(run.worldTour && run.worldTour.selectedRegions.length > 0);
  const raceKind = stage.raceKind ?? "championship";
  const position = result.playerPosition ?? LEGACY_OUTCOME_POSITION[result.outcome];
  const policy = raceSettlementPolicy(raceKind, position);
  // Computed from credits banked before this stage's own income (FR-007).
  const interestAmount = policy.accruesInterest ? interestFor(run.credits) : 0;

  appendTransaction("participation", worldTourActive ? policy.participationCredits : 2);
  if (result.outcome === "win") appendTransaction("win-bonus", worldTourActive ? policy.winBonusCredits : 2);
  if (interestAmount > 0) appendTransaction("interest", interestAmount);

  let sponsorOutcome: SponsorContract | undefined;
  let sponsorFailed = false;
  const sponsorEligible = raceKind === "championship"
    || run.activeSponsorContract?.objective.kind === "trigger-tagged-items";
  if (run.activeSponsorContract && sponsorEligible) {
    const resolution = resolvePendingSponsor(run.activeSponsorContract, result);
    sponsorOutcome = {
      ...resolution.contract,
      resolvedEncounterId: active.id,
    };
    if (resolution.succeeded) appendTransaction("sponsor-conditional", sponsorOutcome.payout);
    sponsorFailed = !resolution.succeeded;
  }

  const historyEntry: RunHistoryEntry = {
    encounterId: active.id,
    stagePosition: stage.position,
    type: "pvp",
    creditTransactionIds: encounterTransactionIds,
    pvpOutcome: {
      outcome: result.outcome,
      lapCount: result.lapCount,
      playerTime: result.playerTime,
      ghostTime: result.ghostTime,
      gap: result.gap,
    },
    sponsorOutcome,
  };

  let next: Run = {
    ...run,
    credits,
    creditTransactions: transactions,
    activeSponsorContract: sponsorEligible ? null : run.activeSponsorContract,
    history: [...run.history, historyEntry],
  };
  // Independent triggers (015-economy-depth FR-002, research.md Decision 2):
  // both may fire on the same stage transition, each its own delta.
  if (worldTourActive && next.worldTour) {
    const reputation = settleWorldTourReputation({
      reputation: next.reputation,
      lastChanceStatus: next.worldTour.lastChanceStatus,
      delta: policy.reputationDelta + (sponsorFailed ? SPONSOR_FAILURE_REPUTATION_DELTA : 0),
      hasNextRace: stage.position < 40,
    });
    next = {
      ...next,
      reputation: reputation.reputation,
      status: reputation.failed ? "failed" : next.status,
      worldTour: { ...next.worldTour, lastChanceStatus: reputation.lastChanceStatus },
    };
    if (raceKind === "championship" && result.finishingOrder) {
      const finishingOrder = result.finishingOrder.map((entrantId) =>
        entrantId === "player" ? run.identity.entrantId : entrantId);
      if (finishingOrder.length === 8) {
        const currentTour = next.worldTour!;
        const standings = applyChampionshipResult(currentTour.standings, finishingOrder);
        const championshipRaceCount = standings[0]?.championshipFinishes.length ?? 0;
        next = {
          ...next,
          worldTour: {
            ...currentTour,
            standings,
            finaleMode: championshipRaceCount === 9
              ? (qualifiesForEliteFinale(standings, run.identity.entrantId) ? "elite" : "normal")
              : currentTour.finaleMode,
          },
        };
      }
    }
  } else {
    next = applyRaceReputationChange(next, position);
    if (sponsorFailed) next = applySponsorFailurePenalty(next);
  }

  return advanceRun(next, rng);
}

/**
 * Applies the position-based reputation delta for a finished race, floored
 * at 0 (015-economy-depth contract §1, chat follow-up rescale). Called only
 * from completePvpEncounter, before its advanceRun call.
 */
export function applyRaceReputationChange(run: Run, position: number): Run {
  return { ...run, reputation: Math.max(0, run.reputation + reputationDeltaForPosition(position)) };
}

/**
 * Decrements reputation by a flat amount for a failed sponsor objective,
 * floored at 0 (015-economy-depth contract §1). Called only from
 * completePvpEncounter, before its advanceRun call — a sponsor objective
 * can only resolve at PvP completion, so no other call site can produce
 * this trigger.
 */
export function applySponsorFailurePenalty(run: Run): Run {
  return { ...run, reputation: Math.max(0, run.reputation + SPONSOR_FAILURE_REPUTATION_DELTA) };
}

function compactItemIds(items: readonly (OfferedItem | null)[]): string[] {
  return items.flatMap((item) => item ? [item.id] : []);
}

function sameIds(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
}

function advanceRun(run: Run, rng: RandomSource): Run {
  const nextIndex = run.stageIndex + 1;

  // Leading check (015-economy-depth FR-003, research.md Decision 1):
  // reputation loss takes priority over a simultaneous Stage 6 completion.
  if (run.status === "failed" || (run.reputation <= 0 && !run.worldTour?.selectedRegions.length)) {
    return {
      ...run,
      status: "failed",
      stageIndex: Math.min(nextIndex, run.stages.length),
      stages: run.stages.map((stage, index) =>
        index === run.stageIndex ? { ...stage, state: "completed" } : stage,
      ),
      availableChoices: [],
      activeEncounter: null,
    };
  }

  if (nextIndex >= run.stages.length && run.worldTour?.phase === "racing") {
    const worldTour = completeCurrentTourLeg(run.id, run.seed, {
      ...run.worldTour,
      currentGlobalStageIndex: nextIndex,
    });
    if (worldTour.phase === "awaiting-destination") {
      return {
        ...run,
        worldTour,
        stageIndex: nextIndex,
        stages: run.stages.map((stage, index) => index === run.stageIndex ? { ...stage, state: "completed" } : stage),
        availableChoices: [],
        activeEncounter: null,
      };
    }
    if (worldTour.phase === "racing") {
      const paris = worldTour.legs[worldTour.legs.length - 1];
      const stages = [
        ...run.stages.map((stage, index) => index === run.stageIndex ? { ...stage, state: "completed" as const } : stage),
        ...runStagesForTourLeg(run.id, paris, run.stages.length),
      ];
      const next: Run = { ...run, worldTour, stages, stageIndex: nextIndex, availableChoices: [], activeEncounter: null };
      return { ...next, availableChoices: generateEncounterChoices(next, rng) };
    }
    return {
      ...run,
      worldTour,
      status: "completed",
      stageIndex: nextIndex,
      stages: run.stages.map((stage, index) => index === run.stageIndex ? { ...stage, state: "completed" } : stage),
      availableChoices: [],
      activeEncounter: null,
    };
  }

  if (nextIndex >= run.stages.length) {
    return {
      ...run,
      status: "completed",
      stageIndex: run.stages.length,
      stages: run.stages.map((stage, index) =>
        index === run.stageIndex ? { ...stage, state: "completed" } : stage,
      ),
      availableChoices: [],
      activeEncounter: null,
    };
  }

  const stages = run.stages.map((stage, index) => {
    if (index === run.stageIndex) return { ...stage, state: "completed" as const };
    if (index === nextIndex) return { ...stage, state: stage.kind === "pvp" ? "active" as const : "available" as const };
    return stage;
  });
  const nextStage = stages[nextIndex];
  const next: Run = {
    ...run,
    worldTour: run.worldTour ? { ...run.worldTour, currentGlobalStageIndex: nextIndex } : undefined,
    stageIndex: nextIndex,
    stages,
    availableChoices: [],
    activeEncounter: nextStage.kind === "pvp"
      ? {
          id: `${nextStage.id}-encounter`,
          stageId: nextStage.id,
          type: "pvp",
          status: "active",
          payload: {
            kind: "pvp",
            lapCount: nextStage.lapCount!,
            raceKind: nextStage.raceKind,
            buildSnapshot: run.build,
          },
        }
      : null,
  };
  return nextStage.kind === "choice"
    ? { ...next, availableChoices: generateEncounterChoices(next, rng) }
    : next;
}

function assertActive(run: Run): void {
  if (run.status !== "active") {
    throw new RunTransitionError("run-not-active", `Run ${run.id} is ${run.status}`);
  }
}
