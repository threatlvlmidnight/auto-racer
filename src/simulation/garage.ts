import { resolveInstallation } from "./slots";
import {
  VEHICLE_STORAGE_CAPACITY,
  type InstallationResolution,
  type ItemDefinition,
  type VehicleBuild,
} from "./types";

/**
 * The single validation path for every change to the active build (contract §5).
 * Preview and commit run the same logic so what the player is shown before
 * confirming is exactly what happens on commit.
 *
 * Category mismatch is never a failure here — it changes which authored
 * behavior applies (Fitted/Flexible/Improvised), never whether a placement is
 * allowed. Only capacity/state problems produce a typed reason.
 */

export type GarageSource =
  | { area: "offer"; offerId: string }
  | { area: "vehicle"; slotId: string }
  | { area: "storage"; index: number };

export type GarageDestination =
  | { area: "vehicle"; slotId: string }
  | { area: "storage"; index: number };

export type GarageReplacement = "none" | "swap" | "evict";

export interface GarageCommand {
  source: GarageSource;
  destination: GarageDestination;
  replacement: GarageReplacement;
}

export interface GarageOffer {
  id: string;
  item: ItemDefinition;
}

export interface GarageContext {
  build: VehicleBuild;
  offers?: readonly GarageOffer[];
}

export type GarageDisposition = "place" | "move" | "swap" | "replace" | "evict" | "no-op";

export type GarageFailureCode =
  | "missing-source"
  | "stale-offer"
  | "unknown-slot"
  | "invalid-storage-index"
  | "requires-confirmation"
  | "invalid-run-context";

export interface PlacementPreview {
  source: GarageSource;
  destination: GarageDestination;
  /** Always true unless the command is structurally impossible. */
  legal: boolean;
  disposition: GarageDisposition;
  requiresConfirmation: boolean;
  /** Present only for a vehicle-slot destination; storage has no installation state. */
  installation: InstallationResolution | null;
  /** The item currently at the destination, if any. */
  occupant: ItemDefinition | null;
  /** The item being moved or placed. */
  item: ItemDefinition | null;
  reason: GarageFailureCode | null;
}

export type GarageCommitResult =
  | { kind: "committed"; build: VehicleBuild; evicted: ItemDefinition | null; preview: PlacementPreview }
  | { kind: "failure"; code: GarageFailureCode; preview: PlacementPreview };

function slotIndexOf(build: VehicleBuild, slotId: string): number {
  return build.slots.findIndex((slot) => slot.slotId === slotId);
}

function validStorageIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < VEHICLE_STORAGE_CAPACITY;
}

function samePosition(source: GarageSource, destination: GarageDestination): boolean {
  if (source.area === "vehicle" && destination.area === "vehicle") {
    return source.slotId === destination.slotId;
  }
  if (source.area === "storage" && destination.area === "storage") {
    return source.index === destination.index;
  }
  return false;
}

function failedPreview(
  command: GarageCommand,
  code: GarageFailureCode,
  extra: Partial<PlacementPreview> = {},
): PlacementPreview {
  return {
    source: command.source,
    destination: command.destination,
    // A structurally impossible command is not "illegal placement" — it is a
    // stale/unknown reference. Legality is about category, and category never
    // blocks. Only a genuinely unresolvable command is marked illegal.
    legal: code === "requires-confirmation",
    disposition: "no-op",
    requiresConfirmation: code === "requires-confirmation",
    installation: null,
    occupant: null,
    item: null,
    reason: code,
    ...extra,
  };
}

export function previewGarageCommand(context: GarageContext, command: GarageCommand): PlacementPreview {
  const { build } = context;
  if (!build || !Array.isArray(build.slots) || !Array.isArray(build.storage)) {
    return failedPreview(command, "invalid-run-context");
  }

  // --- resolve the source item ---
  let item: ItemDefinition | null = null;
  if (command.source.area === "offer") {
    const offerId = command.source.offerId;
    const offer = (context.offers ?? []).find((candidate) => candidate.id === offerId);
    if (!offer) return failedPreview(command, "stale-offer");
    item = offer.item;
  } else if (command.source.area === "vehicle") {
    const index = slotIndexOf(build, command.source.slotId);
    if (index === -1) return failedPreview(command, "unknown-slot");
    item = build.slots[index].item;
    if (!item) return failedPreview(command, "missing-source");
  } else {
    if (!validStorageIndex(command.source.index)) {
      return failedPreview(command, "invalid-storage-index");
    }
    item = build.storage[command.source.index].item;
    if (!item) return failedPreview(command, "missing-source");
  }

  // --- resolve the destination ---
  let occupant: ItemDefinition | null = null;
  let installation: InstallationResolution | null = null;
  if (command.destination.area === "vehicle") {
    const index = slotIndexOf(build, command.destination.slotId);
    if (index === -1) return failedPreview(command, "unknown-slot");
    occupant = build.slots[index].item;
    installation = resolveInstallation(item, build.slots[index].slotType);
  } else {
    if (!validStorageIndex(command.destination.index)) {
      return failedPreview(command, "invalid-storage-index");
    }
    occupant = build.storage[command.destination.index].item;
  }

  const base = {
    source: command.source,
    destination: command.destination,
    legal: true,
    installation,
    occupant,
    item,
  };

  if (samePosition(command.source, command.destination)) {
    return { ...base, disposition: "no-op", requiresConfirmation: false, reason: null };
  }

  if (!occupant) {
    return {
      ...base,
      disposition: command.source.area === "offer" ? "place" : "move",
      requiresConfirmation: false,
      reason: null,
    };
  }

  // Occupied destination: the player must have declared what happens to the
  // existing item before anything irreversible is committed.
  if (command.replacement === "swap") {
    // An offer has no position to swap back into, so swapping needs a held item.
    if (command.source.area === "offer") {
      return { ...base, disposition: "replace", requiresConfirmation: true, reason: "requires-confirmation" };
    }
    return { ...base, disposition: "swap", requiresConfirmation: false, reason: null };
  }

  if (command.replacement === "evict") {
    return {
      ...base,
      disposition: command.source.area === "offer" ? "replace" : "evict",
      requiresConfirmation: true,
      reason: null,
    };
  }

  return {
    ...base,
    disposition: command.source.area === "offer" ? "replace" : "evict",
    requiresConfirmation: true,
    reason: "requires-confirmation",
  };
}

export function commitGarageCommand(context: GarageContext, command: GarageCommand): GarageCommitResult {
  const preview = previewGarageCommand(context, command);
  if (preview.reason) return { kind: "failure", code: preview.reason, preview };
  if (preview.disposition === "no-op") {
    return { kind: "committed", build: context.build, evicted: null, preview };
  }

  const item = preview.item!;
  const slots = context.build.slots.map((slot) => ({ ...slot }));
  const storage = context.build.storage.map((position) => ({ ...position }));

  // Tier travels with the item on a move/swap; a fresh offer placement
  // always starts at tier 1 (016-duplicate-item-tiering data-model.md).
  const sourceTier = command.source.area === "vehicle"
    ? slots[slotIndexOf(context.build, command.source.slotId)].tier
    : command.source.area === "storage"
      ? storage[command.source.index].tier
      : 1;
  const destinationTier = command.destination.area === "vehicle"
    ? slots[slotIndexOf(context.build, command.destination.slotId)].tier
    : storage[command.destination.index].tier;

  // Clear the source first so a single item can never occupy two positions.
  if (command.source.area === "vehicle") {
    slots[slotIndexOf(context.build, command.source.slotId)].item = null;
  } else if (command.source.area === "storage") {
    storage[command.source.index].item = null;
  }

  // A swap sends the displaced occupant back to the source position.
  const displaced = preview.occupant;
  if (preview.disposition === "swap" && displaced) {
    if (command.source.area === "vehicle") {
      const slot = slots[slotIndexOf(context.build, command.source.slotId)];
      slot.item = displaced;
      slot.tier = destinationTier;
    } else if (command.source.area === "storage") {
      const position = storage[command.source.index];
      position.item = displaced;
      position.tier = destinationTier;
    }
  }

  if (command.destination.area === "vehicle") {
    const slot = slots[slotIndexOf(context.build, command.destination.slotId)];
    slot.item = item;
    slot.tier = sourceTier;
  } else {
    const position = storage[command.destination.index];
    position.item = item;
    position.tier = sourceTier;
  }

  const evicted = preview.disposition === "replace" || preview.disposition === "evict" ? displaced : null;
  return {
    kind: "committed",
    build: { ...context.build, slots, storage },
    evicted,
    preview,
  };
}

export type SellItemResult =
  | { kind: "sold"; build: VehicleBuild; item: ItemDefinition; creditsGained: number }
  | { kind: "failure"; code: "missing-source" };

/**
 * Sell any held item (active or stored) for half its authored price,
 * rounded down (015-economy-depth contract §3). Not a GarageCommand
 * variant — selling has no destination, unlike every movement this
 * contract otherwise governs (research.md Decision 4).
 */
export function sellItem(
  build: VehicleBuild,
  source: Extract<GarageSource, { area: "vehicle" | "storage" }>,
): SellItemResult {
  const item = source.area === "vehicle"
    ? build.slots.find((slot) => slot.slotId === source.slotId)?.item ?? null
    : build.storage[source.index]?.item ?? null;
  if (!item) return { kind: "failure", code: "missing-source" };

  const slots = source.area === "vehicle"
    ? build.slots.map((slot) => (slot.slotId === source.slotId ? { ...slot, item: null } : slot))
    : build.slots;
  const storage = source.area === "storage"
    ? build.storage.map((position, index) => (index === source.index ? { ...position, item: null } : position))
    : build.storage;

  return {
    kind: "sold",
    build: { ...build, slots, storage },
    item,
    creditsGained: Math.floor(item.price / 2),
  };
}
