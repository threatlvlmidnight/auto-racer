import { createItemInstance, nextInstanceId } from "./itemInstances";
import type { InstanceBuild, ItemDefinition, ItemInstance } from "./types";

/**
 * Atomic encounter build operations (034 tasks T033/T039/T040/T041). Every
 * function is pure: it returns a new `InstanceBuild` or a typed failure and
 * never mutates the input. "Atomic rollback" is therefore structural — a failed
 * confirmation leaves the original run/build exactly unchanged.
 */

export type TransactionResult<T> =
  | { kind: "ok"; value: T }
  | { kind: "failure"; code: TransactionFailureCode; reason: string };

export type TransactionFailureCode =
  | "missing-instance"
  | "max-tier"
  | "insufficient-credits"
  | "category-mismatch"
  | "not-foreign"
  | "invalid-tier"
  | "no-capacity"
  | "invalid-candidate";

export const REBUILD_CREDIT_COST = 2;

/** Upgrades one held instance by one tier; rejects a tier-3 instance. */
export function upgradeInstance(instance: ItemInstance): TransactionResult<ItemInstance> {
  if (instance.tier === 3) return { kind: "failure", code: "max-tier", reason: "Already at max tier" };
  return {
    kind: "ok",
    value: { ...instance, instanceId: instance.instanceId, tier: ((instance.tier + 1) as 1 | 2 | 3) },
  };
}

export interface PlacementCapacity {
  freeSlotId: string | null;
  freeStorageIndex: number | null;
  full: boolean;
}

/** Capacity against run garage topology: an empty slot, else an empty storage index. */
export function placementCapacity(build: InstanceBuild): PlacementCapacity {
  const freeSlot = build.slots.find((slot) => slot.instance === null);
  const freeStorage = build.storage.find((position) => position.instance === null);
  return {
    freeSlotId: freeSlot?.slotId ?? null,
    freeStorageIndex: freeStorage?.index ?? null,
    full: !freeSlot && !freeStorage,
  };
}

function requireInstance(
  build: InstanceBuild,
  instanceId: string,
): TransactionResult<{ slotIndex: number; instance: ItemInstance }> {
  const slotIndex = build.slots.findIndex((slot) => slot.instance?.instanceId === instanceId);
  if (slotIndex >= 0) return { kind: "ok", value: { slotIndex, instance: build.slots[slotIndex].instance as ItemInstance } };
  const storageIndex = build.storage.findIndex((position) => position.instance?.instanceId === instanceId);
  if (storageIndex >= 0) {
    return { kind: "ok", value: { slotIndex: storageIndex, instance: build.storage[storageIndex].instance as ItemInstance } };
  }
  return { kind: "failure", code: "missing-instance", reason: "No held item with that instance id" };
}

/**
 * Privateer Exchange: replace the exact source instance with a same-tier
 * foreign-origin item (034 T040). The replacement's origin must differ from the
 * sourced definition's origin. Replacement keeps the source tier, is unmodified,
 * and occupies the source's exact vehicle slot.
 */
export function exchangeSameTierForeign(
  build: InstanceBuild,
  sourceInstanceId: string,
  sourceDef: ItemDefinition,
  replacementDef: ItemDefinition,
  replacementInstanceId = nextInstanceId(),
): TransactionResult<InstanceBuild> {
  const found = requireInstance(build, sourceInstanceId);
  if (found.kind === "failure") return found;
  if (replacementDef.origin === sourceDef.origin) {
    return { kind: "failure", code: "not-foreign", reason: "Exchange requires a foreign-origin item" };
  }
  const source = found.value.instance;
  const replacement: ItemInstance = {
    instanceId: replacementInstanceId,
    definitionId: replacementDef.id,
    tier: source.tier,
    modification: null,
    scrutineeringBonusPercent: 0,
    provenance: "encounter",
  };
  const isVehicle = build.slots[found.value.slotIndex]?.instance === source;
  const updated = isVehicle
    ? {
        ...build,
        slots: build.slots.map((slot, index) =>
          index === found.value.slotIndex ? { ...slot, instance: replacement } : slot,
        ),
      }
    : {
        ...build,
        storage: build.storage.map((position, index) =>
          index === found.value.slotIndex ? { ...position, instance: replacement } : position,
        ),
      };
  return { kind: "ok", value: updated };
}

/**
 * Experimental Rebuild: surrender a tier-1/tier-2 source for a +1-tier,
 * same-installation-category, unmodified replacement after paying 2 credits
 * (034 T041, FR-047). The source's modification is destroyed with the source.
 */
export function rebuildForCredit(
  build: InstanceBuild,
  sourceInstanceId: string,
  sourceDef: ItemDefinition,
  sourceDefPrice: number,
  availableCredits: number,
  paidCredits: number,
  replacementDef: ItemDefinition,
  replacementInstanceId = nextInstanceId(),
): TransactionResult<InstanceBuild> {
  if (paidCredits !== REBUILD_CREDIT_COST) {
    return { kind: "failure", code: "invalid-candidate", reason: "Rebuild costs exactly 2 credits" };
  }
  if (availableCredits < paidCredits) {
    return { kind: "failure", code: "insufficient-credits", reason: "Not enough credits" };
  }
  const found = requireInstance(build, sourceInstanceId);
  if (found.kind === "failure") return found;
  const source = found.value.instance;
  if (source.tier === 3) return { kind: "failure", code: "invalid-tier", reason: "Only tier-1 or tier-2 sources rebuild" };
  if (replacementDef.installationCategory !== sourceDef.installationCategory) {
    return { kind: "failure", code: "category-mismatch", reason: "Replacement must match installation category" };
  }
  const replacement: ItemInstance = {
    instanceId: replacementInstanceId,
    definitionId: replacementDef.id,
    tier: ((source.tier + 1) as 1 | 2 | 3),
    modification: null,
    scrutineeringBonusPercent: 0,
    provenance: "encounter",
  };
  void sourceDefPrice;
  const isVehicle = build.slots[found.value.slotIndex]?.instance === source;
  const updated = isVehicle
    ? {
        ...build,
        slots: build.slots.map((slot, index) =>
          index === found.value.slotIndex ? { ...slot, instance: replacement } : slot,
        ),
      }
    : {
        ...build,
        storage: build.storage.map((position, index) =>
          index === found.value.slotIndex ? { ...position, instance: replacement } : position,
        ),
      };
  return { kind: "ok", value: updated };
}

/**
 * Atomic confirmation guard: runs a pure build operation and returns its typed
 * result, or a failure when the operation throws. All concrete operations
 * already return new builds on success, so a failure never mutates the run.
 */
export function applyAtomic<T>(
  _build: InstanceBuild,
  op: () => TransactionResult<T>,
): TransactionResult<T> {
  try {
    return op();
  } catch {
    return { kind: "failure", code: "invalid-candidate", reason: "Atomic rollback" };
  }
}

export { createItemInstance };
