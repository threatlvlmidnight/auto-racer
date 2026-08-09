import { vehicleById } from "../content/entrants";
import {
  previewGarageCommand,
  type GarageCommand,
  type GarageContext,
  type GarageDisposition,
  type GarageFailureCode,
} from "../simulation/garage";
import { resolveInstallation } from "../simulation/slots";
import type {
  InstallationState,
  ItemDefinition,
  RunIdentity,
  SlotType,
  VehicleBuild,
} from "../simulation/types";
import { itemVisualDescriptor } from "./itemVisualDescriptor";

// Pure presentation models for the named-vehicle garage. These format the
// authoritative build and the pure garage preview — they never recompute
// installation state, credits, or run validity (contract §6).

const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  power: "POWER",
  chassis: "CHASSIS",
  flex: "FLEX",
};

const INSTALLATION_LABELS: Record<InstallationState, string> = {
  fitted: "Fitted",
  flexible: "Flexible",
  improvised: "Improvised",
};

const DISPOSITION_LABELS: Record<GarageDisposition, string> = {
  place: "PLACE",
  move: "MOVE",
  swap: "SWAP",
  replace: "REPLACE",
  evict: "EVICT",
  "no-op": "NO CHANGE",
};

const FAILURE_LABELS: Record<GarageFailureCode, string> = {
  "missing-source": "There is no item in that position to move.",
  "stale-offer": "That offer is no longer available.",
  "unknown-slot": "That vehicle slot does not exist.",
  "invalid-storage-index": "That storage position does not exist.",
  "requires-confirmation": "This would remove the item already there — confirm to continue.",
  "invalid-run-context": "This garage is unavailable.",
};

export interface GarageVehicleHeader {
  vehicleName: string;
  /** Names the active build surface after the vehicle, never a generic board. */
  label: string;
  storageLabel: string;
  topologyLabel: string;
}

export function garageVehicleHeader(identity: RunIdentity): GarageVehicleHeader {
  const vehicle = vehicleById(identity.vehicleId);
  const name = vehicle?.name ?? "Vehicle";
  const types = (vehicle?.slots ?? []).map((slot) => slot.type);
  const count = (type: SlotType) => types.filter((entry) => entry === type).length;
  return {
    vehicleName: name,
    label: `${name.toUpperCase()} · INSTALLED`,
    storageLabel: "WORKSHOP STORAGE · INERT BY DEFAULT",
    topologyLabel: `${count("power")} Power · ${count("chassis")} Chassis · ${count("flex")} Flex`,
  };
}

export interface GarageSlotModel {
  order: number;
  slotId: string;
  slotType: SlotType;
  typeLabel: string;
  occupied: boolean;
  stateLabel: string;
  itemId: string | null;
  itemName: string | null;
  installationState: InstallationState | null;
  installationLabel: string | null;
}

export function garageSlotModels(build: VehicleBuild): GarageSlotModel[] {
  return build.slots.map((slot, order) => {
    const item = slot.item;
    const installation = item ? resolveInstallation(item, slot.slotType) : null;
    return {
      order,
      slotId: slot.slotId,
      slotType: slot.slotType,
      typeLabel: SLOT_TYPE_LABELS[slot.slotType],
      occupied: item !== null,
      stateLabel: item ? "OCCUPIED" : "EMPTY",
      itemId: item?.id ?? null,
      itemName: item?.name ?? null,
      installationState: installation?.state ?? null,
      installationLabel: installation ? INSTALLATION_LABELS[installation.state] : null,
    };
  });
}

export interface GarageStorageModel {
  order: number;
  index: number;
  occupied: boolean;
  /** Storage has no Power/Chassis/Flex affinity — only active-while-stored. */
  storageActive: boolean;
  stateLabel: string;
  itemId: string | null;
  itemName: string | null;
}

export function garageStorageModels(build: VehicleBuild): GarageStorageModel[] {
  return build.storage.map((position, order) => {
    const item = position.item;
    const storageActive = item?.activeWhileStored === true;
    return {
      order,
      index: position.index,
      occupied: item !== null,
      storageActive,
      stateLabel: !item ? "EMPTY" : storageActive ? "STORED · ACTIVE" : "STORED · INERT",
      itemId: item?.id ?? null,
      itemName: item?.name ?? null,
    };
  });
}

export interface GarageItemSummary {
  id: string;
  name: string;
  categoryLabel: string;
  originLabel: string;
  baseEffectLabel: string;
  fittedLabel: string;
  improvisedLabel: string;
}

function itemSummary(item: ItemDefinition): GarageItemSummary {
  return {
    id: item.id,
    name: item.name,
    categoryLabel: item.installationCategory.toUpperCase(),
    originLabel: item.origin,
    baseEffectLabel: `${item.timeModifier >= 0 ? "+" : ""}${item.timeModifier.toFixed(2)}s per firing`,
    fittedLabel: item.fittedBehavior.description,
    improvisedLabel: item.improvisedBehavior.description,
  };
}

function cooldownLabel(item: ItemDefinition): string {
  const descriptor = itemVisualDescriptor(item);
  if (item.buff && item.cooldown === undefined) return "Always on";
  return descriptor.cooldown === 1 ? "Fires every lap" : `Fires every ${descriptor.cooldown} laps`;
}

export interface GarageItemInspector extends GarageItemSummary {
  synergyTags: readonly string[];
  priceLabel: string;
  affordable: boolean;
  cooldownLabel: string;
  storageBehaviorLabel: string;
  /** Null only for a storage destination, which has no installation state. */
  installationState: InstallationState | null;
  /** The additional behavior this placement grants, if any. */
  gainedBehaviorLabel: string | null;
  /** The item's own Fitted behavior, disclosed only when this placement loses it. */
  lostBehaviorLabel: string | null;
  /** Set only for an Improvised placement that adds no consequence. */
  noAdditionalConsequenceLabel: string | null;
}

/**
 * The persistent selected-item inspector (contract §6): every authored,
 * installation, price, affordability, and storage-behavior fact needed to
 * decide a placement without hovering. `slotType` is the destination under
 * consideration — `null` for a storage destination, which has no
 * installation state of its own.
 */
export function garageItemInspector(
  item: ItemDefinition,
  slotType: SlotType | null,
  credits: number,
): GarageItemInspector {
  const summary = itemSummary(item);
  const resolution = slotType ? resolveInstallation(item, slotType) : null;

  return {
    ...summary,
    synergyTags: item.synergyTags,
    priceLabel: `${item.price} credits`,
    affordable: item.price <= credits,
    cooldownLabel: cooldownLabel(item),
    storageBehaviorLabel: item.activeWhileStored ? "Active while stored" : "Inert while stored",
    installationState: resolution?.state ?? null,
    gainedBehaviorLabel: resolution?.appliedInstallationBehavior?.description ?? null,
    lostBehaviorLabel: resolution?.lostFittedBehavior?.description ?? null,
    noAdditionalConsequenceLabel: resolution?.noAdditionalImprovisedConsequence
      ? item.improvisedBehavior.description
      : null,
  };
}

export interface GarageComparisonModel {
  candidate: GarageItemSummary;
  occupant: GarageItemSummary;
  /** Exact, plain statement of what happens to the occupant. */
  outcome: string;
}

export function garageComparisonModel(
  candidate: ItemDefinition,
  occupant: ItemDefinition,
  disposition: GarageDisposition,
): GarageComparisonModel {
  const outcome = disposition === "swap"
    ? `${occupant.name} moves to where ${candidate.name} came from. Both items are kept.`
    : `${occupant.name} is removed from the build to make room for ${candidate.name}. This cannot be undone.`;
  return { candidate: itemSummary(candidate), occupant: itemSummary(occupant), outcome };
}

export interface GaragePreviewModel {
  available: boolean;
  disposition: GarageDisposition;
  dispositionLabel: string;
  requiresConfirmation: boolean;
  installationState: InstallationState | null;
  installationLabel: string | null;
  /** Present only when an existing item would be displaced. */
  comparison: GarageComparisonModel | null;
  reasonLabel: string | null;
}

export function garagePreviewModel(context: GarageContext, command: GarageCommand): GaragePreviewModel {
  const preview = previewGarageCommand(context, command);
  // A category mismatch is never a reason to refuse; only capacity/state is.
  const blocked = preview.reason !== null;
  const installation = preview.installation;

  return {
    available: !blocked,
    disposition: preview.disposition,
    dispositionLabel: DISPOSITION_LABELS[preview.disposition],
    requiresConfirmation: preview.requiresConfirmation,
    installationState: installation?.state ?? null,
    installationLabel: installation ? INSTALLATION_LABELS[installation.state] : null,
    comparison: preview.item && preview.occupant
      ? garageComparisonModel(preview.item, preview.occupant, preview.disposition)
      : null,
    reasonLabel: preview.reason ? FAILURE_LABELS[preview.reason] : null,
  };
}

export interface GarageDestinationEntry {
  order: number;
  area: "vehicle" | "storage";
  slotId?: string;
  index?: number;
  label: string;
  pointer: true;
  touch: true;
}

/**
 * Deterministic focus traversal: all four vehicle slots in authored topology
 * order, then the three storage positions. Keyboard, pointer, and touch all
 * address the same destinations.
 */
export function garageDestinationOrder(build: VehicleBuild): GarageDestinationEntry[] {
  const slots: GarageDestinationEntry[] = build.slots.map((slot, order) => ({
    order,
    area: "vehicle" as const,
    slotId: slot.slotId,
    label: `${SLOT_TYPE_LABELS[slot.slotType]} slot ${order + 1}`,
    pointer: true,
    touch: true,
  }));
  const storage: GarageDestinationEntry[] = build.storage.map((position, offset) => ({
    order: slots.length + offset,
    area: "storage" as const,
    index: position.index,
    label: `Storage ${position.index + 1}`,
    pointer: true,
    touch: true,
  }));
  return [...slots, ...storage];
}
