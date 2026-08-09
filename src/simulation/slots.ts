import { vehicleById } from "../content/entrants";
import type {
  InstallationResolution,
  ItemDefinition,
  SlotType,
  VehicleBuild,
  VehicleId,
  VehicleSlotState,
} from "./types";

/**
 * Topology-ordered accessors. The generic `board` array is gone; simulation and
 * presentation read installed items through these so slot identity/order stays
 * canonical and is never reconstructed by callers.
 */
export function installedItems(build: VehicleBuild): (ItemDefinition | null)[] {
  return build.slots.map((slot) => slot.item);
}

export function storedItems(build: VehicleBuild): (ItemDefinition | null)[] {
  return build.storage.map((position) => position.item);
}

export function slotById(build: VehicleBuild, slotId: string): VehicleSlotState | undefined {
  return build.slots.find((slot) => slot.slotId === slotId);
}

export function hasOpenSlot(build: VehicleBuild): boolean {
  return build.slots.some((slot) => slot.item === null);
}

export function addItem(build: VehicleBuild, item: ItemDefinition, slotIndex: number): VehicleBuild {
  const slot = build.slots[slotIndex];
  if (!slot || slot.item !== null) {
    throw new Error(`Cannot add an item to vehicle slot ${slotIndex}`);
  }

  return {
    ...build,
    slots: build.slots.map((slot, index) => (index === slotIndex ? { ...slot, item } : slot)),
  };
}

export function evictAndAdd(build: VehicleBuild, evictIndex: number, item: ItemDefinition): VehicleBuild {
  if (evictIndex < 0 || evictIndex >= build.slots.length || build.slots[evictIndex].item === null) {
    throw new RangeError(`Invalid eviction index: ${evictIndex}`);
  }

  return {
    ...build,
    slots: build.slots.map((slot, index) => (index === evictIndex ? { ...slot, item } : slot)),
  };
}

/**
 * Pure installation truth table (contract §4). Category mismatch is always
 * legal — it changes which authored behavior applies, never whether the
 * placement is allowed.
 */
export function resolveInstallation(item: ItemDefinition, slotType: SlotType): InstallationResolution {
  const baseBehavior = {
    kind: "time-modifier" as const,
    timeModifier: item.timeModifier,
    description: `Base: ${item.timeModifier.toFixed(2)}s per firing.`,
  };

  if (slotType === "flex") {
    return {
      state: "flexible",
      baseBehavior,
      appliedInstallationBehavior: null,
      lostFittedBehavior: item.fittedBehavior,
      noAdditionalImprovisedConsequence: false,
    };
  }

  if (slotType === item.installationCategory) {
    return {
      state: "fitted",
      baseBehavior,
      appliedInstallationBehavior: item.fittedBehavior,
      lostFittedBehavior: null,
      noAdditionalImprovisedConsequence: false,
    };
  }

  const hasConsequence = item.improvisedBehavior.kind !== "none";
  return {
    state: "improvised",
    baseBehavior,
    appliedInstallationBehavior: hasConsequence ? item.improvisedBehavior : null,
    lostFittedBehavior: item.fittedBehavior,
    noAdditionalImprovisedConsequence: !hasConsequence,
  };
}

/** Authored slot types for a vehicle, in canonical order. */
export function topologyFor(vehicleId: VehicleId): SlotType[] {
  return (vehicleById(vehicleId)?.slots ?? []).map((slot) => slot.type);
}
