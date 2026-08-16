import { drawItem } from "./draft";
import { commitGarageCommand, sellItem, undoSale, type GarageDestination, type GarageSource } from "./garage";
import { allItemDefinitions, poolForCrossPollination, poolForEntrant } from "./itemPools";
import {
  activateChoice,
  completeNonPvpEncounter,
  RunTransitionError,
  SPONSOR_OBJECTIVE_TAGS,
  type CreditTransaction,
  type EncounterPayload,
  type EncounterChoice,
  type Run,
  type SponsorContract,
  type SponsorObjective,
} from "./run";
import { resolveDuplicateAcquisition } from "./tiering";
import { reconcileLiveInstances } from "./liveItemInstances";
import {
  cadenceDomainRng,
  generateEncounterPair,
  isAcquisitionPrimary,
  recordSelection,
  upgradeGuaranteePending,
} from "./encounterCadence";
import { ENCOUNTER_VARIANTS, variantsFor } from "../content/encounterVariants";
import { generateTagSpecialistStock, purchaseTagStock, qualifyingTags, type TagStockEntry } from "./tagSpecialist";
import { evaluateExhibitionResult, generateExhibitionTrial, type ExhibitionContestEvidence, type ExhibitionTrial } from "./exhibition";
import { projectEncounterHistory, type EncounterHistoryInput } from "./historyProjection";
import { projectInstanceBuild } from "./liveItemInstances";
import { upgradeWorkshopFree } from "./encounterOffers";
import { attachModification, offeredModificationsFor } from "./itemModifications";
import { buildWorkshopModification, specById } from "../content/itemModifications";
import { commitScrutineering } from "./scrutineering";
import { exchangeSameTierForeign, rebuildForCredit } from "./encounterTransactions";
import { TAG_WEIGHT, type AcquisitionReceipt, type Build, type ContestResult, type OfferedItem, type VehicleBuild } from "./types";

export type RandomSource = () => number;
export const EXHIBITION_MIN_CHOICE_ORDINAL = 9;

export function exhibitionEligibleAtChoiceOrdinal(choiceOrdinal: number): boolean {
  return choiceOrdinal >= EXHIBITION_MIN_CHOICE_ORDINAL;
}

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

export interface CrossPollinationPayload {
  kind: "cross-pollination";
  guestEntrantId: Run["identity"]["entrantId"];
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
  receipts?: AcquisitionReceipt[];
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
  "cross-pollination": "Choose a part from another origin's experimental catalog.",
  "sponsor-meeting": "Take 2 credits now or accept a 7-credit race objective.",
} as const;

/**
 * Feature 034 (T027): registered summaries for the seven new encounter types.
 * Kept separate from ENCOUNTER_SUMMARIES so the legacy choice generator and its
 * pinned fixtures are untouched; scenes that surface these types read from here.
 */
export const NEW_ENCOUNTER_SUMMARIES: Readonly<Record<NewEncounterType, string>> = {
  "exhibition-trial": "Run an unscored solo race toward three exact objectives.",
  scrutineering: "Voluntarily sacrifice one part for a one-race boost to the rest.",
  "factory-development": "Attach one run-persistent Workshop Modification to a part.",
  "upgrade-workshop": "A guaranteed free tier-upgrade offer (optional to accept).",
  "privateer-exchange": "Swap one part for a same-tier foreign-origin part.",
  "experimental-rebuild": "Pay 2 credits to rebuild a part one tier higher.",
  "tag-specialist": "Stock keyed to a tag your garage already holds; one part already re-worked.",
};

/** The seven Feature 034 encounter types (types.ts EncounterType minus the legacy four). */
export type NewEncounterType =
  | "exhibition-trial"
  | "scrutineering"
  | "factory-development"
  | "upgrade-workshop"
  | "privateer-exchange"
  | "experimental-rebuild"
  | "tag-specialist";

/** Every registered encounter type, legacy four + the seven new (T027 registration). */
export function registeredEncounterTypes(): readonly (keyof typeof ENCOUNTER_SUMMARIES | NewEncounterType)[] {
  return [
    ...(Object.keys(ENCOUNTER_SUMMARIES) as (keyof typeof ENCOUNTER_SUMMARIES)[]),
    ...(Object.keys(NEW_ENCOUNTER_SUMMARIES) as NewEncounterType[]),
  ];
}

export function generateEncounterChoices(run: Run, rng: RandomSource): EncounterChoice[] {
  const stage = run.stages[run.stageIndex];
  if (!stage || stage.kind !== "choice") return [];
  if (run.cadenceState && run.instanceBuild && Boolean(run.worldTour?.selectedRegions.length)) {
    const catalog = allItemDefinitions();
    const eligible = registeredEncounterTypes().filter((type) => {
      if (type === "exhibition-trial") return exhibitionEligibleAtChoiceOrdinal(stage.choiceOrdinal ?? 0);
      if (type === "sponsor-meeting") return run.activeSponsorContract === null;
      if (type === "scrutineering") return !run.pendingScrutineering
        && run.instanceBuild!.slots.filter((slot) => slot.instance).length >= 2;
      if (type === "factory-development" || type === "privateer-exchange") {
        return run.instanceBuild!.slots.some((slot) => slot.instance)
          || run.instanceBuild!.storage.some((position) => position.instance);
      }
      if (type === "upgrade-workshop") {
        return [...run.instanceBuild!.slots.map((slot) => slot.instance), ...run.instanceBuild!.storage.map((position) => position.instance)]
          .some((instance) => instance !== null && instance.tier < 3);
      }
      if (type === "experimental-rebuild") {
        return run.credits >= 2
          && [...run.instanceBuild!.slots.map((slot) => slot.instance), ...run.instanceBuild!.storage.map((position) => position.instance)]
            .some((instance) => instance !== null && instance.tier < 3);
      }
      if (type === "tag-specialist") {
        return (stage.choiceOrdinal ?? 0) >= 17 && qualifyingTags(run.instanceBuild!, catalog).length > 0;
      }
      return true;
    });
    const domainRng = cadenceDomainRng(run.seed, stage.choiceOrdinal ?? run.cadenceState.choiceOrdinal + 1);
    let pair = generateEncounterPair(run.cadenceState, eligible, domainRng);
    // Guarantee the workshop in each global half whenever a legal target exists.
    if (eligible.includes("upgrade-workshop") && upgradeGuaranteePending(run.cadenceState, stage.position)) {
      const counterpart = eligible.find((type) => type !== "upgrade-workshop" && isAcquisitionPrimary(type))
        ?? eligible.find((type) => type !== "upgrade-workshop" && !isAcquisitionPrimary(type))
        ?? eligible.find((type) => type !== "upgrade-workshop");
      if (counterpart) pair = { kinds: ["upgrade-workshop", counterpart], fallback: false };
    }
    // Preserve the established opening-leg Sponsor contract opportunity. The
    // next-Championship targeting contract depends on meeting the Sponsor
    // before the intervening Local Race, while later stages use full cadence.
    if ((stage.choiceOrdinal ?? 0) === 1 && eligible.includes("sponsor-meeting")
      && !pair.fallback && !pair.kinds.includes("sponsor-meeting")) {
      const acquisition = pair.kinds.find(isAcquisitionPrimary) ?? pair.kinds[0];
      pair = { kinds: [acquisition, "sponsor-meeting"], fallback: false };
    }
    if (pair.fallback) return [];
    return pair.kinds.map((type, index) => {
      const variants = variantsFor(type);
      const variant = variants.length > 0
        ? variants[Math.floor(domainRng() * variants.length) % variants.length]
        : null;
      return {
        id: `${stage.id}-choice-${index + 1}`,
        stageId: stage.id,
        type,
        summary: variant?.description ?? (NEW_ENCOUNTER_SUMMARIES as Partial<Record<NewEncounterType, string>>)[type as NewEncounterType]
          ?? ENCOUNTER_SUMMARIES[type as keyof typeof ENCOUNTER_SUMMARIES],
        variantId: variant?.variantId,
        title: variant?.title,
      };
    });
  }
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
  rng: RandomSource,
): Run {
  const choice = run.availableChoices.find(({ id }) => id === choiceId);
  if (!choice) {
    throw new RunTransitionError("encounter-id-mismatch", `Choice ${choiceId} is not current`);
  }
  const activeBase = activateChoice(run, choice);
  const active = activeBase.cadenceState
    ? { ...activeBase, cadenceState: recordSelection(activeBase.cadenceState, choice.type) }
    : activeBase;
  const payload = createPayload(active, choice, rng);
  return {
    ...active,
    activeEncounter: active.activeEncounter
      ? { ...active.activeEncounter, payload: payload as EncounterPayload }
      : null,
  };
}

function createPayload(
  run: Run,
  choice: EncounterChoice,
  rng: RandomSource,
): RewardDraftPayload | CrossPollinationPayload | PartsSupplierPayload | SponsorMeetingPayload | import("./run").PendingEncounterPayload {
  const encounter = run.activeEncounter!;
  const type = choice.type;
  if (type === "reward-draft") {
    const itemPool = poolForEntrant(run.identity.entrantId);
    return {
      kind: type,
      offers: Array.from({ length: 3 }, (_, index) => ({
        id: `${encounter.id}-offer-${index + 1}`,
        item: drawItem([...itemPool], run.identityTag, TAG_WEIGHT, rng),
      })),
      selection: null,
    };
  }
  if (type === "cross-pollination") {
    const guest = poolForCrossPollination(run.identity.entrantId, run.seed, encounter.id);
    return {
      kind: type,
      guestEntrantId: guest.guestEntrantId,
      offers: Array.from({ length: 3 }, (_, index) => ({
        id: `${encounter.id}-offer-${index + 1}`,
        item: guest.pool[Math.min(guest.pool.length - 1, Math.floor(rng() * guest.pool.length))],
      })),
      selection: null,
    };
  }
  if (type === "parts-supplier") {
    return createSupplierPayload(run, rng);
  }
  if (type === "sponsor-meeting") return createSponsorPayload(run, rng);
  const variant = choice.variantId
    ? ENCOUNTER_VARIANTS.find((candidate) => candidate.variantId === choice.variantId)
    : undefined;
  if (type === "exhibition-trial") {
    return {
      kind: type,
      variantId: variant?.variantId,
      data: generateExhibitionTrial(run.seed, run.cadenceState?.choiceOrdinal ?? 1),
    };
  }
  if (type === "tag-specialist") {
    return {
      kind: type,
      variantId: variant?.variantId,
      data: {
        qualifyingTags: qualifyingTags(run.instanceBuild!, allItemDefinitions()),
        selectedTag: null,
        stock: [],
        restockUsed: false,
      } satisfies TagSpecialistPayloadData,
    };
  }
  return { kind: type, variantId: variant?.variantId };
}

export interface TagSpecialistPayloadData {
  qualifyingTags: readonly string[];
  selectedTag: string | null;
  stock: readonly TagStockEntry[];
  restockUsed: boolean;
}

function tagPayload(run: Run): TagSpecialistPayloadData | null {
  if (run.activeEncounter?.type !== "tag-specialist" || run.activeEncounter.payload.kind !== "tag-specialist") return null;
  return run.activeEncounter.payload.data as TagSpecialistPayloadData | null;
}

export function selectTagSpecialistTag(run: Run, tag: string, rng: RandomSource = () => 0): Run {
  const data = tagPayload(run);
  if (!data || !data.qualifyingTags.includes(tag)) throw new RunTransitionError("invalid-action", "Tag is not qualified");
  const pool = allItemDefinitions().filter((item) => item.origin !== run.identity.origin);
  const stock = generateTagSpecialistStock(tag, pool, rng, run.stageIndex + 1, `${run.seed}:${run.activeEncounter!.id}:tag`);
  const payload = { ...run.activeEncounter!.payload, data: { ...data, selectedTag: tag, stock, restockUsed: false } };
  return { ...run, activeEncounter: { ...run.activeEncounter!, payload }, encounterRevision: (run.encounterRevision ?? 0) + 1 };
}

export function restockTagSpecialist(run: Run, rng: RandomSource = () => 0): Run {
  const data = tagPayload(run);
  if (!data?.selectedTag || data.restockUsed) throw new RunTransitionError("invalid-action", "Tag Specialist restock is unavailable");
  const pool = allItemDefinitions().filter((item) => item.origin !== run.identity.origin);
  const stock = generateTagSpecialistStock(data.selectedTag, pool, rng, run.stageIndex + 1, `${run.seed}:${run.activeEncounter!.id}:restock`);
  const payload = { ...run.activeEncounter!.payload, data: { ...data, stock, restockUsed: true } };
  return { ...run, activeEncounter: { ...run.activeEncounter!, payload }, encounterRevision: (run.encounterRevision ?? 0) + 1 };
}

function createSupplierPayload(
  run: Run,
  rng: RandomSource,
): PartsSupplierPayload {
  // 020-character-item-pools data-model.md "Signature simplification": pool
  // membership is now fully derivable from run.identity.entrantId, and it's
  // already the correctly-gated Neutral + own-entrant pool — no additional
  // identityTag-based narrowing on top (research.md Decision 3).
  const eligible = poolForEntrant(run.identity.entrantId);
  if (eligible.length === 0) {
    return { kind: "parts-supplier", stock: [], unavailable: true, restockUsed: false, purchases: [], receipts: [] };
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
    receipts: [],
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
        objective: objectiveForKind(run, kind, rng),
      })),
    ],
    selection: null,
  };
}

function objectiveForKind(run: Run, kind: SponsorObjective["kind"], rng: RandomSource): SponsorObjective {
  if (kind === "target-race-time") {
    const nextPvp = run.stages.slice(run.stageIndex + 1).find((stage) =>
      stage.kind === "pvp" && stage.raceKind !== "local")!;
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
    // 020-character-item-pools research.md Decision 4: deterministic per
    // (run seed, stage) like every other draft/encounter decision (FR-008),
    // never a single hardcoded tag.
    const tagIndex = Math.min(SPONSOR_OBJECTIVE_TAGS.length - 1, Math.floor(rng() * SPONSOR_OBJECTIVE_TAGS.length));
    return { kind, tag: SPONSOR_OBJECTIVE_TAGS[tagIndex], requiredEvents: 10 };
  }
  return { kind };
}

export function seededTargetSeconds(input: {
  seed: number;
  pvpOrdinal: number;
  baseLapTime: number;
  lapCount: 8 | 10 | 12 | 14 | 16;
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
        .filter((item) => item.synergyTags.includes(objective.tag))
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
  if (run.status !== "active" || run.activeEncounter?.id !== encounterId) {
    throw new RunTransitionError("encounter-id-mismatch", `${encounterId} is not current`);
  }
  const kind = run.activeEncounter.payload.kind;
  if (kind !== "reward-draft" && kind !== "cross-pollination") {
    throw new RunTransitionError("invalid-encounter-type", "Expected reward acquisition");
  }
  const payload = run.activeEncounter.payload as RewardDraftPayload | CrossPollinationPayload;
  if (payload.selection !== null) {
    throw new RunTransitionError("invalid-action", "Reward Draft is already resolved");
  }
  const offer = payload.offers.find(({ id }) => id === offerId);
  if (!offer) throw new RunTransitionError("encounter-id-mismatch", `Offer ${offerId} is not current`);
  const acquisition = applyAcquisition(run.build, offer.item, placement);
  const { run: updated, creditTransactionIds } = withDuplicateConversion(run, encounterId, acquisition);
  const live = withLiveBuild(updated, acquisition.build, "draft");
  return completeNonPvpEncounter(
    live,
    encounterId,
    { build: live.build, acquisitionOutcome: { kind: "accepted", itemIds: [offer.item.id] }, creditTransactionIds },
    rng,
  );
}

export function declineReward(
  run: Run,
  encounterId: string,
  rng: RandomSource = () => 0,
): Run {
  if (run.activeEncounter?.id !== encounterId
    || (run.activeEncounter.payload.kind !== "reward-draft"
      && run.activeEncounter.payload.kind !== "cross-pollination")) {
    throw new RunTransitionError("invalid-encounter-type", "Expected reward acquisition");
  }
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
  const acquisition = applyAcquisition(run.build, stock.item, placement, stockId);
  const purchaseTransaction = transactionFor(run, encounterId, "purchase", -stock.item.price);
  const afterPurchase: Run = {
    ...run,
    saleUndo: run.saleUndo ? { ...run.saleUndo, valid: false } : undefined,
    credits: purchaseTransaction.balanceAfter,
    creditTransactions: [...run.creditTransactions, purchaseTransaction],
  };
  const { run: afterConversion } = withDuplicateConversion(afterPurchase, encounterId, acquisition);
  const live = withLiveBuild(afterConversion, acquisition.build, "encounter");
  return {
    ...live,
    activeEncounter: {
      ...run.activeEncounter!,
      payload: {
        ...payload,
        stock: payload.stock.map((entry) => entry.id === stockId ? { ...entry, state: "purchased" } : entry),
        purchases: [...payload.purchases, stock.item.id],
        receipts: [...(payload.receipts ?? []), acquisition.receipt],
      } as EncounterPayload,
    },
  };
}

export function restockSupplier(
  run: Run,
  encounterId: string,
  rng: RandomSource,
): Run {
  const payload = requirePayload<PartsSupplierPayload>(run, encounterId, "parts-supplier");
  if (payload.restockUsed || payload.unavailable) {
    throw new RunTransitionError("invalid-action", "Supplier restock is unavailable");
  }
  if (run.credits < 1) throw new RunTransitionError("insufficient-credits", "Restock costs 1 credit");
  // 020-character-item-pools data-model.md "Signature simplification": same
  // reasoning as createSupplierPayload — pool is derived from
  // run.identity.entrantId and already correctly gated.
  const eligible = poolForEntrant(run.identity.entrantId);
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
        // Restock is an atomic replacement of the complete offer surface:
        // old purchase/lock state cannot leak into the new three-slot offer.
        stock: Array.from({ length: 3 }, (_, index) => ({
          id: `${encounterId}-restock-${index + 1}`,
          item: eligible[Math.min(eligible.length - 1, Math.floor(rng() * eligible.length))],
          state: "available" as const,
          locked: false,
        })),
        purchases: [],
        receipts: [],
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
  const receipt = { ...result.receipt, creditsBefore: run.credits, creditsAfter: transaction.balanceAfter };
  const live = withLiveBuild(run, result.build, "encounter");
  return {
    ...live,
    credits: transaction.balanceAfter,
    creditTransactions: [...run.creditTransactions, transaction],
    saleUndo: { receipt, valid: true },
  };
}

/** Inventory-host sale path for surfaces that do not own an active encounter. */
export function sellInventoryItem(
  run: Run,
  source: Extract<GarageSource, { area: "vehicle" | "storage" }>,
): Run {
  if (run.status !== "active") throw new RunTransitionError("invalid-action", "Inventory is unavailable outside an active run");
  const result = sellItem(run.build, source);
  if (result.kind === "failure") throw new RunTransitionError("invalid-action", "Cannot sell: no item at that position");
  const contextId = run.activeEncounter?.id ?? `${run.id}-inventory-${run.stageIndex}`;
  const transaction = transactionFor(run, contextId, "sell-back", result.creditsGained);
  const receipt = { ...result.receipt, creditsBefore: run.credits, creditsAfter: transaction.balanceAfter };
  const live = withLiveBuild(run, result.build, "encounter");
  return { ...live, credits: transaction.balanceAfter,
    creditTransactions: [...run.creditTransactions, transaction], saleUndo: { receipt, valid: true } };
}

export function invalidateSaleUndo(run: Run): Run {
  return run.saleUndo?.valid ? { ...run, saleUndo: { ...run.saleUndo, valid: false } } : run;
}

export function undoSoldItem(run: Run, encounterId: string): Run {
  if (!run.saleUndo?.valid) throw new RunTransitionError("invalid-action", "Sale Undo is no longer available");
  const undo = undoSale(run.build, run.saleUndo.receipt);
  if (undo.kind === "invalid") throw new RunTransitionError("invalid-action", "The original inventory location is unavailable");
  const sale = run.saleUndo.receipt;
  const live = withLiveBuild(run, undo.build, "encounter");
  return {
    ...live,
    credits: sale.creditsBefore,
    creditTransactions: [...run.creditTransactions, transactionFor(run, encounterId, "sell-back", -sale.totalPayout)],
    saleUndo: { ...run.saleUndo, valid: false },
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
  receipt: AcquisitionReceipt;
}

function acquisitionReceipt(item: OfferedItem, resolution: ReturnType<typeof resolveDuplicateAcquisition>, offerId = item.id): AcquisitionReceipt {
  const upgraded = resolution.kind === "tier-upgrade";
  const oldTier = upgraded ? resolution.fromTier : null;
  const newTier = upgraded ? resolution.toTier : resolution.kind === "new" ? 1 : null;
  return {
    offerId,
    status: upgraded ? "upgraded" : resolution.kind === "new" ? "purchased" : "unavailable",
    itemId: item.id,
    itemName: item.name,
    oldTier,
    newTier,
    changedEffects: upgraded ? [{ label: "Authored effect", oldValue: `${oldTier}× tier strength`, newValue: `${newTier}× tier strength` }] : [],
  };
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
  offerId?: string,
): AcquisitionApplication {
  const resolution = resolveDuplicateAcquisition(build, item);
  if (resolution.kind === "new") {
    if (!placement) {
      throw new RunTransitionError("invalid-action", `A placement is required to acquire ${item.name}`);
    }
    return { build: applyPlacement(build, item, placement), duplicateCreditsGained: 0, receipt: acquisitionReceipt(item, resolution, offerId) };
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
    return { build: updatedBuild, duplicateCreditsGained: 0, receipt: acquisitionReceipt(item, resolution, offerId) };
  }
  return { build, duplicateCreditsGained: resolution.creditsGained, receipt: acquisitionReceipt(item, resolution, offerId) };
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

function withLiveBuild(
  run: Run,
  build: VehicleBuild,
  provenance: import("./types").InstanceProvenance,
): Run {
  if (build === run.build) return run;
  const reservedSlotId = run.pendingScrutineering?.reservation.slotId;
  if (reservedSlotId && build.slots.find((slot) => slot.slotId === reservedSlotId)?.item) {
    throw new RunTransitionError("invalid-action", "Scrutineering has reserved that vehicle slot until settlement");
  }
  if (!run.encounterVarietyVersion) return { ...run, build };
  const reconciled = reconcileLiveInstances(
    run.build,
    build,
    run.instanceBuild,
    { runId: run.id, nextOrdinal: run.itemInstanceOrdinal ?? 1 },
    provenance,
  );
  if (reconciled.kind !== "ok") {
    throw new RunTransitionError("invalid-action", `Instance authority unavailable (${reconciled.reason})`);
  }
  return {
    ...run,
    build: reconciled.build,
    instanceBuild: reconciled.instanceBuild,
    itemInstanceOrdinal: reconciled.nextOrdinal,
    encounterRevision: (run.encounterRevision ?? 0) + 1,
  };
}

// --- Feature 034 retained encounter lifecycle / atomic action contract -----

export type VarietyEncounterAction =
  | { kind: "decline" }
  | { kind: "unavailable"; reason: string }
  | { kind: "upgrade"; instanceId: string }
  | { kind: "modify"; instanceId: string; modificationId: string }
  | { kind: "scrutineer"; slotId: string }
  | { kind: "exchange"; instanceId: string; replacementDefinitionId: string }
  | { kind: "rebuild"; instanceId: string; replacementDefinitionId: string }
  | { kind: "tag-purchase"; entryId: string };

export interface VarietyActionPreview {
  encounterId: string;
  encounterType: NewEncounterType;
  action: VarietyEncounterAction;
  stateFingerprint: string;
  costCredits: number;
  consequence: string;
  disabledReason: string | null;
}

export type VarietyConfirmation =
  | { kind: "confirmed"; run: Run }
  | { kind: "stale" | "illegal" | "unavailable" | "already-settled"; run: Run; reason: string };

function varietyFingerprint(run: Run, action: VarietyEncounterAction): string {
  return `${run.activeEncounter?.id ?? "none"}:${run.encounterRevision ?? 0}:${JSON.stringify(action)}`;
}

export function previewVarietyEncounterAction(run: Run, action: VarietyEncounterAction): VarietyActionPreview {
  const active = run.activeEncounter;
  if (!active || active.type === "pvp" || !(active.type in NEW_ENCOUNTER_SUMMARIES)) {
    throw new RunTransitionError("invalid-encounter-type", "Expected Feature 034 encounter");
  }
  let disabledReason: string | null = null;
  if (!run.instanceBuild) disabledReason = "Legacy run has no instance authority";
  if (action.kind === "upgrade") {
    const target = run.instanceBuild
      ? [...run.instanceBuild.slots.map((slot) => slot.instance), ...run.instanceBuild.storage.map((position) => position.instance)]
        .find((instance) => instance?.instanceId === action.instanceId)
      : null;
    if (!target) disabledReason = "Selected item is no longer held";
    else if (target.tier === 3) disabledReason = "Selected item is already max tier";
  }
  if (action.kind === "modify" && run.instanceBuild) {
    const target = [...run.instanceBuild.slots.map((slot) => slot.instance), ...run.instanceBuild.storage.map((position) => position.instance)]
      .find((instance) => instance?.instanceId === action.instanceId);
    const definition = target ? allItemDefinitions().find((item) => item.id === target.definitionId) : null;
    if (!target || !definition) disabledReason = "Selected item is no longer available";
    else {
      const spec = specById(action.modificationId);
      if (!spec || !offeredModificationsFor(definition).some((candidate) => candidate.modificationId === spec.modificationId)) {
        disabledReason = "Modification is unavailable for this item";
      }
    }
  }
  if (action.kind === "scrutineer") {
    if (run.pendingScrutineering) disabledReason = "A Scrutineering effect is already pending";
    else if (!run.instanceBuild?.slots.find((slot) => slot.slotId === action.slotId)?.instance) {
      disabledReason = "Select an installed item";
    }
  }
  if (action.kind === "exchange" || action.kind === "rebuild") {
    const held = run.instanceBuild
      ? [...run.instanceBuild.slots.map((slot) => slot.instance), ...run.instanceBuild.storage.map((position) => position.instance)]
      : [];
    const target = held.find((instance) => instance?.instanceId === action.instanceId);
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const source = target ? catalog.get(target.definitionId) : undefined;
    const replacement = catalog.get(action.replacementDefinitionId);
    if (!target || !source || !replacement) disabledReason = "Selected item or replacement is unavailable";
    else if (action.kind === "exchange" && replacement.origin === source.origin) disabledReason = "Replacement must be foreign-origin";
    else if (action.kind === "rebuild" && target.tier === 3) disabledReason = "Max-tier items cannot be rebuilt";
    else if (action.kind === "rebuild" && replacement.installationCategory !== source.installationCategory) {
      disabledReason = "Replacement must match the installation category";
    } else if (action.kind === "rebuild" && run.credits < 2) disabledReason = "Rebuild requires 2 credits";
  }
  if (action.kind === "tag-purchase") {
    const data = tagPayload(run);
    const entry = data?.stock.find((candidate) => candidate.entryId === action.entryId);
    if (!entry) disabledReason = "Stock entry is unavailable";
    else if (run.credits < entry.price) disabledReason = `Requires ${entry.price} credits`;
    else if (run.instanceBuild && !run.instanceBuild.slots.some((slot) => !slot.instance)
      && !run.instanceBuild.storage.some((position) => !position.instance)) disabledReason = "Garage is full";
  }
  return {
    encounterId: active.id,
    encounterType: active.type as NewEncounterType,
    action,
    stateFingerprint: varietyFingerprint(run, action),
    costCredits: action.kind === "rebuild" ? 2
      : action.kind === "tag-purchase" ? tagPayload(run)?.stock.find((entry) => entry.entryId === action.entryId)?.price ?? 0 : 0,
    consequence: action.kind === "decline" ? "Leave without changing the run"
      : action.kind === "unavailable" ? action.reason
        : action.kind === "upgrade" ? "Raise the exact item by one tier"
          : action.kind === "modify" ? "Replace the exact item's Workshop Modification"
            : action.kind === "exchange" ? "Trade the exact item for the selected same-tier foreign part"
              : action.kind === "rebuild" ? "Pay 2 credits and replace the exact item one tier higher"
                : action.kind === "tag-purchase" ? "Buy this exact retained stock entry"
                  : "Impound this item for the next scored race and boost the others",
    disabledReason,
  };
}

function appendVarietyEvidence(
  run: Run,
  outcome: EncounterHistoryInput["outcome"],
  fingerprint: string,
  pendingCategory: EncounterHistoryInput["pendingCategory"] = null,
  targetStage: number | null = null,
  creditsDelta = 0,
): Run {
  const active = run.activeEncounter!;
  const evidence: EncounterHistoryInput = {
    encounterId: active.id,
    typeId: active.type as NewEncounterType,
    stageOrdinal: run.stages[run.stageIndex]?.position ?? run.stageIndex + 1,
    outcome,
    creditsDelta,
    pendingCategory,
    targetStage,
    mutationFingerprint: fingerprint,
  };
  return { ...run, encounterHistory: [...(run.encounterHistory ?? []), evidence] };
}

function nextScoredStage(run: Run): number {
  return run.stages.slice(run.stageIndex + 1).find((stage) => stage.kind === "pvp")?.position
    ?? run.stageIndex + 2;
}

function mapInstanceBuild(
  build: import("./types").InstanceBuild,
  instanceId: string,
  update: (instance: import("./types").ItemInstance) => import("./types").ItemInstance,
): import("./types").InstanceBuild {
  return {
    ...build,
    slots: build.slots.map((slot) => slot.instance?.instanceId === instanceId ? { ...slot, instance: update(slot.instance) } : slot),
    storage: build.storage.map((position) => position.instance?.instanceId === instanceId ? { ...position, instance: update(position.instance) } : position),
  };
}

export function confirmVarietyEncounterAction(
  run: Run,
  preview: VarietyActionPreview,
  rng: RandomSource = () => 0,
): VarietyConfirmation {
  if (run.encounterHistory?.some((entry) => entry.encounterId === preview.encounterId)) {
    return { kind: "already-settled", run, reason: "Encounter already settled" };
  }
  if (run.activeEncounter?.id !== preview.encounterId
    || varietyFingerprint(run, preview.action) !== preview.stateFingerprint) {
    return { kind: "stale", run, reason: "Run state changed after preview" };
  }
  if (preview.disabledReason) return { kind: "unavailable", run, reason: preview.disabledReason };
  if (!run.instanceBuild) return { kind: "unavailable", run, reason: "Instance authority unavailable" };

  let next = run;
  let outcome: EncounterHistoryInput["outcome"] = "accepted";
  if (preview.action.kind === "decline" || preview.action.kind === "unavailable") {
    outcome = preview.action.kind === "decline" ? "declined" : "unavailable";
  } else if (preview.action.kind === "upgrade") {
    const upgraded = upgradeWorkshopFree(run.instanceBuild, preview.action.instanceId);
    if (upgraded.kind !== "ok") return { kind: "illegal", run, reason: upgraded.code };
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const projected = projectInstanceBuild(upgraded.build, catalog);
    if (!projected) return { kind: "unavailable", run, reason: "Unknown item definition" };
    next = { ...run, instanceBuild: upgraded.build, build: projected, encounterRevision: (run.encounterRevision ?? 0) + 1 };
  } else if (preview.action.kind === "modify") {
    const modification = buildWorkshopModification(preview.action.modificationId, preview.encounterId, run.stageIndex + 1);
    if (!modification) return { kind: "illegal", run, reason: "Unknown modification" };
    const instanceBuild = mapInstanceBuild(run.instanceBuild, preview.action.instanceId, (instance) => attachModification(instance, modification));
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const projected = projectInstanceBuild(instanceBuild, catalog);
    if (!projected) return { kind: "unavailable", run, reason: "Unknown item definition" };
    next = { ...run, instanceBuild, build: projected, encounterRevision: (run.encounterRevision ?? 0) + 1 };
  } else if (preview.action.kind === "scrutineer") {
    const slotId = preview.action.slotId;
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const result = commitScrutineering(
      run.instanceBuild,
      slotId,
      run.stageIndex + 1,
      undefined,
      (instance) => catalog.get(instance.definitionId)?.price ?? 0,
    );
    if (result.kind !== "committed") return { kind: "unavailable", run, reason: result.reason };
    const recoveredInstance = run.instanceBuild.slots.find((slot) => slot.slotId === slotId)!.instance!;
    const pendingEffectId = `${preview.encounterId}-scrutineering`;
    const projected = projectInstanceBuild(result.build, catalog);
    if (!projected) return { kind: "unavailable", run, reason: "Unknown item definition" };
    const target = nextScoredStage(run);
    next = {
      ...run,
      instanceBuild: result.build,
      build: projected,
      pendingScrutineering: {
        pendingEffectId,
        sourceEncounterId: preview.encounterId,
        template: result.template,
        reservation: { pendingEffectId, slotId: result.template.reservedSlotId, surrenderedInstanceId: result.template.surrenderedInstanceId },
        recoveredInstance,
        targetScoredStage: target,
        status: "pending",
      },
      encounterRevision: (run.encounterRevision ?? 0) + 1,
    };
    next = appendVarietyEvidence(next, "pending", preview.stateFingerprint, "scrutineering", target);
    return {
      kind: "confirmed",
      run: completeNonPvpEncounter(next, preview.encounterId, { build: next.build, acquisitionOutcome: { kind: "scrutineering-pending" } }, rng),
    };
  } else if (preview.action.kind === "exchange" || preview.action.kind === "rebuild") {
    const action = preview.action;
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const held = [...run.instanceBuild.slots.map((slot) => slot.instance), ...run.instanceBuild.storage.map((position) => position.instance)];
    const target = held.find((instance) => instance?.instanceId === action.instanceId);
    const source = target ? catalog.get(target.definitionId) : undefined;
    const replacement = catalog.get(action.replacementDefinitionId);
    if (!target || !source || !replacement) return { kind: "unavailable", run, reason: "Item definition unavailable" };
    const replacementId = `${run.id}-item-${run.itemInstanceOrdinal ?? 1}`;
    const changed = action.kind === "exchange"
      ? exchangeSameTierForeign(run.instanceBuild, target.instanceId, source, replacement, replacementId)
      : rebuildForCredit(run.instanceBuild, target.instanceId, source, source.price, run.credits, 2, replacement, replacementId);
    if (changed.kind === "failure") return { kind: "illegal", run, reason: changed.code };
    const projected = projectInstanceBuild(changed.value, catalog);
    if (!projected) return { kind: "unavailable", run, reason: "Unknown item definition" };
    next = {
      ...run,
      instanceBuild: changed.value,
      build: projected,
      itemInstanceOrdinal: (run.itemInstanceOrdinal ?? 1) + 1,
      encounterRevision: (run.encounterRevision ?? 0) + 1,
    };
    if (action.kind === "rebuild") {
      const transaction = transactionFor(next, preview.encounterId, "experimental-rebuild", -2);
      next = {
        ...next,
        credits: transaction.balanceAfter,
        creditTransactions: [...next.creditTransactions, transaction],
      };
    }
  } else if (preview.action.kind === "tag-purchase") {
    const action = preview.action;
    const data = tagPayload(run);
    const entry = data?.stock.find((candidate) => candidate.entryId === action.entryId);
    if (!data || !entry) return { kind: "unavailable", run, reason: "Stock entry unavailable" };
    const purchased = purchaseTagStock(
      run.instanceBuild,
      data.stock,
      entry.entryId,
      `${run.id}-item-${run.itemInstanceOrdinal ?? 1}`,
    );
    if (purchased.kind === "failure") return { kind: "illegal", run, reason: purchased.reason };
    const catalog = new Map(allItemDefinitions().map((item) => [item.id, item]));
    const projected = projectInstanceBuild(purchased.build, catalog);
    if (!projected) return { kind: "unavailable", run, reason: "Unknown item definition" };
    const transaction = transactionFor(run, preview.encounterId, "tag-specialist-purchase", -entry.price);
    next = {
      ...run,
      instanceBuild: purchased.build,
      build: projected,
      credits: transaction.balanceAfter,
      creditTransactions: [...run.creditTransactions, transaction],
      itemInstanceOrdinal: (run.itemInstanceOrdinal ?? 1) + 1,
      encounterRevision: (run.encounterRevision ?? 0) + 1,
    };
  }

  next = appendVarietyEvidence(next, outcome, preview.stateFingerprint, null, null, next.credits - run.credits);
  const transactionIds = next.creditTransactions.slice(run.creditTransactions.length).map((transaction) => transaction.id);
  return {
    kind: "confirmed",
    run: completeNonPvpEncounter(next, preview.encounterId, {
      build: next.build,
      acquisitionOutcome: { kind: outcome },
      creditTransactionIds: transactionIds,
    }, rng),
  };
}

/** Deterministic chronology consumed by cadence presentation. */
export function retainedVarietyHistory(run: Run) {
  return projectEncounterHistory(run.encounterHistory ?? []);
}

/** Settles Exhibition evidence without touching scored-race or pending-effect authority. */
export function completeExhibitionEncounter(
  run: Run,
  evidence: ExhibitionContestEvidence,
  rng: RandomSource = () => 0,
): VarietyConfirmation {
  const active = run.activeEncounter;
  if (!active || active.type !== "exhibition-trial" || active.payload.kind !== "exhibition-trial") {
    return { kind: "unavailable", run, reason: "Exhibition is not active" };
  }
  if (run.encounterHistory?.some((entry) => entry.encounterId === active.id)) {
    return { kind: "already-settled", run, reason: "Exhibition already settled" };
  }
  const trial = active.payload.data as ExhibitionTrial | undefined;
  if (!trial) return { kind: "unavailable", run, reason: "Exhibition objectives are unavailable" };
  const result = evaluateExhibitionResult(trial, evidence);
  const fingerprint = `${active.id}:${JSON.stringify(result.objectives)}`;
  const evidenced = appendVarietyEvidence(
    { ...run, reputation: run.reputation + result.reputationAward },
    "accepted",
    fingerprint,
  );
  return {
    kind: "confirmed",
    run: completeNonPvpEncounter(evidenced, active.id, {
      build: run.build,
      acquisitionOutcome: { kind: `exhibition-${result.score}`, itemIds: [] },
    }, rng),
  };
}
