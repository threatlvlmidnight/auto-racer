import { drawItem } from "./draft";
import { commitGarageCommand, sellItem, type GarageDestination, type GarageSource } from "./garage";
import {
  activateChoice,
  completeNonPvpEncounter,
  RunTransitionError,
  type CreditTransaction,
  type EncounterPayload,
  type EncounterChoice,
  type Run,
  type SponsorContract,
  type SponsorObjective,
} from "./run";
import { resolveDuplicateAcquisition } from "./tiering";
import { TAG_WEIGHT, type Build, type ContestResult, type OfferedItem, type VehicleBuild } from "./types";

export type RandomSource = () => number;

/**
 * Where an acquired item goes. Feature 010 replaced the generic board index
 * with the named vehicle's stable slot id; storage keeps its indexed position.
 * This is the same destination type the pure garage commands use, so scenes,
 * encounters, and the garage all speak one vocabulary.
 */
export type PlacementCommand = GarageDestination;

export interface ItemOffer {
  id: string;
  item: OfferedItem;
}

export interface RewardDraftPayload {
  kind: "reward-draft";
  offers: ItemOffer[];
  selection: string | "declined" | null;
}

export interface StockEntry {
  id: string;
  item: OfferedItem;
  state: "available" | "purchased";
  /** New (015-economy-depth FR-010/FR-011). Defaults to false; never persists across encounters. */
  locked: boolean;
}

export interface PartsSupplierPayload {
  kind: "parts-supplier";
  stock: StockEntry[];
  unavailable: boolean;
  restockUsed: boolean;
  purchases: string[];
}

export type SponsorOption =
  | { id: string; kind: "immediate"; payout: 2 }
  | { id: string; kind: SponsorObjective["kind"]; payout: 7; objective: SponsorObjective };

export interface SponsorMeetingPayload {
  kind: "sponsor-meeting";
  options: SponsorOption[];
  selection: string | null;
}

export interface SponsorResolution {
  succeeded: boolean;
  actual: number | string;
  required?: number;
  contract: SponsorContract;
}

const ENCOUNTER_SUMMARIES = {
  "parts-supplier": "Buy any affordable parts; one restock costs 1 credit.",
  "reward-draft": "Choose one of three weighted rewards or decline all.",
  "sponsor-meeting": "Take 2 credits now or accept a 7-credit race objective.",
} as const;

export function generateEncounterChoices(run: Run, rng: RandomSource): EncounterChoice[] {
  const stage = run.stages[run.stageIndex];
  if (!stage || stage.kind !== "choice") return [];
  const eligible = (Object.keys(ENCOUNTER_SUMMARIES) as (keyof typeof ENCOUNTER_SUMMARIES)[])
    .filter((type) => type !== "sponsor-meeting" || run.activeSponsorContract === null);
  const firstIndex = Math.min(eligible.length - 1, Math.floor(rng() * eligible.length));
  const first = eligible[firstIndex];
  const remaining = eligible.filter((type) => type !== first);
  const secondIndex = Math.min(remaining.length - 1, Math.floor(rng() * remaining.length));
  const selected = [first, remaining[secondIndex]];

  return selected.map((type, index) => ({
    id: `${stage.id}-choice-${index + 1}`,
    stageId: stage.id,
    type,
    summary: ENCOUNTER_SUMMARIES[type],
  }));
}

export function chooseEncounter(
  run: Run,
  choiceId: string,
  _rng: RandomSource,
  _itemPool: OfferedItem[],
): Run {
  const choice = run.availableChoices.find(({ id }) => id === choiceId);
  if (!choice) {
    throw new RunTransitionError("encounter-id-mismatch", `Choice ${choiceId} is not current`);
  }
  const active = activateChoice(run, choice);
  const payload = createPayload(active, choice.type, _rng, _itemPool);
  return {
    ...active,
    activeEncounter: active.activeEncounter
      ? { ...active.activeEncounter, payload: payload as EncounterPayload }
      : null,
  };
}

function createPayload(
  run: Run,
  type: EncounterChoice["type"],
  rng: RandomSource,
  itemPool: OfferedItem[],
): RewardDraftPayload | PartsSupplierPayload | SponsorMeetingPayload {
  const encounter = run.activeEncounter!;
  if (type === "reward-draft") {
    return {
      kind: type,
      offers: Array.from({ length: 3 }, (_, index) => ({
        id: `${encounter.id}-offer-${index + 1}`,
        item: drawItem(itemPool, run.identityTag, TAG_WEIGHT, rng),
      })),
      selection: null,
    };
  }
  if (type === "parts-supplier") {
    return createSupplierPayload(run, rng, itemPool);
  }
  return createSponsorPayload(run, rng);
}

function createSupplierPayload(
  run: Run,
  rng: RandomSource,
  itemPool: OfferedItem[],
): PartsSupplierPayload {
  const eligible = itemPool.filter((item) => item.identityTag === run.identityTag);
  if (eligible.length === 0) {
    return { kind: "parts-supplier", stock: [], unavailable: true, restockUsed: false, purchases: [] };
  }
  return {
    kind: "parts-supplier",
    stock: Array.from({ length: 3 }, (_, index) => ({
      id: `${run.activeEncounter!.id}-stock-${index + 1}`,
      item: eligible[Math.min(eligible.length - 1, Math.floor(rng() * eligible.length))],
      state: "available" as const,
      locked: false,
    })),
    unavailable: false,
    restockUsed: false,
    purchases: [],
  };
}

function createSponsorPayload(run: Run, rng: RandomSource): SponsorMeetingPayload {
  const kinds: SponsorObjective["kind"][] = [
    "win-next-race",
    "target-race-time",
    "trigger-tagged-items",
  ];
  const firstIndex = Math.min(kinds.length - 1, Math.floor(rng() * kinds.length));
  const first = kinds[firstIndex];
  const remaining = kinds.filter((kind) => kind !== first);
  const second = remaining[Math.min(remaining.length - 1, Math.floor(rng() * remaining.length))];
  const encounterId = run.activeEncounter!.id;
  return {
    kind: "sponsor-meeting",
    options: [
      { id: `${encounterId}-sponsor-immediate`, kind: "immediate", payout: 2 },
      ...[first, second].map((kind, index) => ({
        id: `${encounterId}-sponsor-contract-${index + 1}`,
        kind,
        payout: 7 as const,
        objective: objectiveForKind(run, kind),
      })),
    ],
    selection: null,
  };
}

function objectiveForKind(run: Run, kind: SponsorObjective["kind"]): SponsorObjective {
  if (kind === "target-race-time") {
    const nextPvp = run.stages.slice(run.stageIndex + 1).find((stage) => stage.kind === "pvp")!;
    return {
      kind,
      targetSeconds: seededTargetSeconds({
        seed: run.seed,
        pvpOrdinal: nextPvp.pvpOrdinal!,
        baseLapTime: run.build.car.baseLapTime,
        lapCount: nextPvp.lapCount!,
      }),
    };
  }
  if (kind === "trigger-tagged-items") {
    return { kind, identityTag: run.identityTag, requiredEvents: 10 };
  }
  return { kind };
}

export function seededTargetSeconds(input: {
  seed: number;
  pvpOrdinal: 1 | 2;
  baseLapTime: number;
  lapCount: 10 | 12;
}): number {
  const offset = 3 + Math.abs((input.seed * 31 + input.pvpOrdinal * 17) % 4);
  return Math.round(input.baseLapTime * input.lapCount) - offset;
}

export function resolvePendingSponsor(
  contract: SponsorContract,
  result: ContestResult,
): SponsorResolution {
  let succeeded: boolean;
  let actual: number | string;
  let required: number | undefined;

  if (contract.objective.kind === "win-next-race") {
    actual = result.outcome;
    succeeded = result.outcome === "win";
  } else if (contract.objective.kind === "target-race-time") {
    actual = result.playerTime;
    succeeded = result.playerTime <= contract.objective.targetSeconds;
  } else {
    const objective = contract.objective;
    const matchingItemIds = new Set(
      [...result.board, ...result.storage]
        .filter((item) => item.identityTag === objective.identityTag)
        .map((item) => item.id),
    );
    actual = result.laps.reduce(
      (count, lap) => count + lap.firedItems.filter(({ id }) => matchingItemIds.has(id)).length,
      0,
    );
    required = objective.requiredEvents;
    succeeded = actual >= required;
  }

  return {
    succeeded,
    actual,
    required,
    contract: {
      ...contract,
      status: succeeded ? "succeeded" : "failed",
      actual,
    },
  };
}

export function acceptReward(
  run: Run,
  encounterId: string,
  offerId: string,
  placement?: PlacementCommand,
  rng: RandomSource = () => 0,
): Run {
  const payload = requirePayload<RewardDraftPayload>(run, encounterId, "reward-draft");
  if (payload.selection !== null) {
    throw new RunTransitionError("invalid-action", "Reward Draft is already resolved");
  }
  const offer = payload.offers.find(({ id }) => id === offerId);
  if (!offer) throw new RunTransitionError("encounter-id-mismatch", `Offer ${offerId} is not current`);
  const acquisition = applyAcquisition(run.build, offer.item, placement);
  const { run: updated, creditTransactionIds } = withDuplicateConversion(run, encounterId, acquisition);
  return completeNonPvpEncounter(
    updated,
    encounterId,
    { build: acquisition.build, acquisitionOutcome: { kind: "accepted", itemIds: [offer.item.id] }, creditTransactionIds },
    rng,
  );
}

export function declineReward(
  run: Run,
  encounterId: string,
  rng: RandomSource = () => 0,
): Run {
  requirePayload<RewardDraftPayload>(run, encounterId, "reward-draft");
  return completeNonPvpEncounter(
    run,
    encounterId,
    { build: run.build, acquisitionOutcome: { kind: "declined" } },
    rng,
  );
}

export function purchaseStock(
  run: Run,
  encounterId: string,
  stockId: string,
  placement?: PlacementCommand,
): Run {
  const payload = requirePayload<PartsSupplierPayload>(run, encounterId, "parts-supplier");
  const stock = payload.stock.find(({ id }) => id === stockId);
  if (!stock || stock.state !== "available") {
    throw new RunTransitionError("invalid-action", `Stock ${stockId} is unavailable`);
  }
  if (stock.item.price > run.credits) {
    throw new RunTransitionError("insufficient-credits", `Cannot afford ${stock.item.name}`);
  }
  const acquisition = applyAcquisition(run.build, stock.item, placement);
  const purchaseTransaction = transactionFor(run, encounterId, "purchase", -stock.item.price);
  const afterPurchase: Run = {
    ...run,
    credits: purchaseTransaction.balanceAfter,
    creditTransactions: [...run.creditTransactions, purchaseTransaction],
  };
  const { run: afterConversion } = withDuplicateConversion(afterPurchase, encounterId, acquisition);
  return {
    ...afterConversion,
    build: acquisition.build,
    activeEncounter: {
      ...run.activeEncounter!,
      payload: {
        ...payload,
        stock: payload.stock.map((entry) => entry.id === stockId ? { ...entry, state: "purchased" } : entry),
        purchases: [...payload.purchases, stock.item.id],
      } as EncounterPayload,
    },
  };
}

export function restockSupplier(
  run: Run,
  encounterId: string,
  rng: RandomSource,
  itemPool: OfferedItem[],
): Run {
  const payload = requirePayload<PartsSupplierPayload>(run, encounterId, "parts-supplier");
  if (payload.restockUsed || payload.unavailable) {
    throw new RunTransitionError("invalid-action", "Supplier restock is unavailable");
  }
  if (run.credits < 1) throw new RunTransitionError("insufficient-credits", "Restock costs 1 credit");
  const eligible = itemPool.filter((item) => item.identityTag === run.identityTag);
  if (eligible.length === 0) throw new RunTransitionError("invalid-action", "No stock is available");
  const transaction = transactionFor(run, encounterId, "restock", -1);
  return {
    ...run,
    credits: transaction.balanceAfter,
    creditTransactions: [...run.creditTransactions, transaction],
    activeEncounter: {
      ...run.activeEncounter!,
      payload: {
        ...payload,
        restockUsed: true,
        stock: payload.stock.map((entry) => entry.state === "purchased" || entry.locked ? entry : {
          ...entry,
          item: eligible[Math.min(eligible.length - 1, Math.floor(rng() * eligible.length))],
        }),
      } as EncounterPayload,
    },
  };
}

/**
 * Sell any held item (active or stored) for half its authored price
 * (015-economy-depth contract §3). Available during any active encounter —
 * selling has no encounter-kind-specific payload of its own, unlike
 * purchaseStock/restockSupplier.
 */
export function sellHeldItem(
  run: Run,
  encounterId: string,
  source: Extract<GarageSource, { area: "vehicle" | "storage" }>,
): Run {
  if (run.status !== "active" || run.activeEncounter?.id !== encounterId) {
    throw new RunTransitionError("encounter-id-mismatch", `${encounterId} is not current`);
  }
  const result = sellItem(run.build, source);
  if (result.kind === "failure") {
    throw new RunTransitionError("invalid-action", "Cannot sell: no item at that position");
  }
  const transaction = transactionFor(run, encounterId, "sell-back", result.creditsGained);
  return {
    ...run,
    build: result.build,
    credits: transaction.balanceAfter,
    creditTransactions: [...run.creditTransactions, transaction],
  };
}

/**
 * Flip one Parts Supplier StockEntry's locked flag (015-economy-depth
 * contract §4). No credit cost, no transaction — purely a reroll-scoping
 * toggle. `locked` is never carried into a freshly-generated payload.
 */
export function toggleLock(run: Run, encounterId: string, stockId: string): Run {
  const payload = requirePayload<PartsSupplierPayload>(run, encounterId, "parts-supplier");
  const stock = payload.stock.find(({ id }) => id === stockId);
  if (!stock) throw new RunTransitionError("encounter-id-mismatch", `Stock ${stockId} is not current`);
  return {
    ...run,
    activeEncounter: {
      ...run.activeEncounter!,
      payload: {
        ...payload,
        stock: payload.stock.map((entry) => entry.id === stockId ? { ...entry, locked: !entry.locked } : entry),
      } as EncounterPayload,
    },
  };
}

export function leaveSupplier(
  run: Run,
  encounterId: string,
  rng: RandomSource = () => 0,
): Run {
  const payload = requirePayload<PartsSupplierPayload>(run, encounterId, "parts-supplier");
  const transactionIds = run.creditTransactions
    .filter((transaction) => transaction.encounterId === encounterId)
    .map(({ id }) => id);
  return completeNonPvpEncounter(
    run,
    encounterId,
    {
      build: run.build,
      acquisitionOutcome: {
        kind: "purchased",
        itemIds: payload.purchases,
        restocked: payload.restockUsed,
      },
      creditTransactionIds: transactionIds,
    },
    rng,
  );
}

export function selectSponsorOption(
  run: Run,
  encounterId: string,
  optionId: string,
  rng: RandomSource = () => 0,
): Run {
  const payload = requirePayload<SponsorMeetingPayload>(run, encounterId, "sponsor-meeting");
  if (run.activeSponsorContract) {
    throw new RunTransitionError("invalid-action", "A sponsor contract is already pending");
  }
  const option = payload.options.find(({ id }) => id === optionId);
  if (!option) throw new RunTransitionError("encounter-id-mismatch", `Sponsor option ${optionId} is not current`);
  if (option.kind === "immediate") {
    const transaction = transactionFor(run, encounterId, "sponsor-immediate", option.payout);
    const updated = {
      ...run,
      credits: transaction.balanceAfter,
      creditTransactions: [...run.creditTransactions, transaction],
    };
    return completeNonPvpEncounter(
      updated,
      encounterId,
      {
        build: run.build,
        acquisitionOutcome: { kind: "sponsor-immediate" },
        creditTransactionIds: [transaction.id],
      },
      rng,
    );
  }
  const contract = {
    id: `${encounterId}-contract`,
    sourceEncounterId: encounterId,
    objective: option.objective,
    payout: 7 as const,
    status: "pending" as const,
  };
  return completeNonPvpEncounter(
    { ...run, activeSponsorContract: contract },
    encounterId,
    { build: run.build, acquisitionOutcome: { kind: "sponsor-contract" } },
    rng,
  );
}

function requirePayload<T>(run: Run, encounterId: string, kind: T extends { kind: infer K } ? K : never): T {
  if (run.status !== "active" || run.activeEncounter?.id !== encounterId) {
    throw new RunTransitionError("encounter-id-mismatch", `${encounterId} is not current`);
  }
  if (run.activeEncounter.payload.kind !== kind) {
    throw new RunTransitionError("invalid-encounter-type", `Expected ${String(kind)}`);
  }
  return run.activeEncounter.payload as T;
}

interface AcquisitionApplication {
  build: VehicleBuild;
  /** >0 only for a max-tier-convert resolution (016-duplicate-item-tiering contract §5). */
  duplicateCreditsGained: number;
}

/**
 * Routes an about-to-be-acquired item through duplicate detection before any
 * placement decision (016-duplicate-item-tiering contract §5). `"new"` falls
 * through to the existing placement path unchanged; `"tier-upgrade"` updates
 * only the matched position's tier; `"max-tier-convert"` leaves the build
 * untouched and reports credits for the caller to record as a transaction.
 */
function applyAcquisition(
  build: VehicleBuild,
  item: OfferedItem,
  placement: PlacementCommand | undefined,
): AcquisitionApplication {
  const resolution = resolveDuplicateAcquisition(build, item);
  if (resolution.kind === "new") {
    if (!placement) {
      throw new RunTransitionError("invalid-action", `A placement is required to acquire ${item.name}`);
    }
    return { build: applyPlacement(build, item, placement), duplicateCreditsGained: 0 };
  }
  if (resolution.kind === "tier-upgrade") {
    const updatedBuild = resolution.area === "vehicle"
      ? {
        ...build,
        slots: build.slots.map((slot) => slot.slotId === resolution.slotId ? { ...slot, tier: resolution.toTier } : slot),
      }
      : {
        ...build,
        storage: build.storage.map((position) => position.index === resolution.index ? { ...position, tier: resolution.toTier } : position),
      };
    return { build: updatedBuild, duplicateCreditsGained: 0 };
  }
  return { build, duplicateCreditsGained: resolution.creditsGained };
}

/**
 * Appends the `"duplicate-conversion"` transaction for a max-tier-convert
 * resolution, if any (016-duplicate-item-tiering contract §5). A no-op that
 * returns `run` unchanged for every other resolution.
 */
function withDuplicateConversion(
  run: Run,
  encounterId: string,
  acquisition: AcquisitionApplication,
): { run: Run; creditTransactionIds: string[] } {
  if (acquisition.duplicateCreditsGained <= 0) return { run, creditTransactionIds: [] };
  const transaction = transactionFor(run, encounterId, "duplicate-conversion", acquisition.duplicateCreditsGained);
  return {
    run: { ...run, credits: transaction.balanceAfter, creditTransactions: [...run.creditTransactions, transaction] },
    creditTransactionIds: [transaction.id],
  };
}

/**
 * Acquisition placement goes through the same pure garage validation the player
 * previewed. A failed placement throws before any credit or encounter mutation
 * is built, so purchase/acceptance stay atomic.
 */
function applyPlacement(build: Build, item: OfferedItem, placement: PlacementCommand): Build {
  const offerId = "__acquisition__";
  const result = commitGarageCommand(
    { build, offers: [{ id: offerId, item }] },
    { source: { area: "offer", offerId }, destination: placement, replacement: "none" },
  );
  if (result.kind === "failure") {
    throw new RunTransitionError("invalid-action", `Invalid item placement (${result.code})`);
  }
  return result.build;
}

function transactionFor(
  run: Run,
  encounterId: string,
  kind: CreditTransaction["kind"],
  amount: number,
): CreditTransaction {
  const balanceAfter = run.credits + amount;
  if (balanceAfter < 0) throw new RunTransitionError("insufficient-credits", "Credits cannot be negative");
  const ordinal = run.creditTransactions.filter((transaction) => transaction.encounterId === encounterId).length + 1;
  return {
    id: `${encounterId}-transaction-${ordinal}`,
    encounterId,
    kind,
    amount,
    balanceAfter,
  };
}