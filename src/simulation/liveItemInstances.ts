import type {
  InstanceBuild,
  InstanceProvenance,
  ItemDefinition,
  ItemInstance,
  VehicleBuild,
} from "./types";
import { resolveModificationEffect } from "./itemModifications";

const PHYSICS_KEYS = ["accelerationDelta", "topSpeedDelta", "brakingPowerDelta", "corneringSpeedDelta"] as const;

function scaledDelta(delta: import("./types").ItemPhysicsContribution, factor: number) {
  const next = { ...delta };
  PHYSICS_KEYS.forEach((key) => {
    if (next[key] !== undefined) next[key] = next[key]! * factor;
  });
  return next;
}

function statDeltaKey(stat: import("./types").CanonicalStatTarget): keyof import("./types").ItemPhysicsContribution {
  return stat === "acceleration" ? "accelerationDelta"
    : stat === "topSpeed" ? "topSpeedDelta"
      : stat === "brakingPower" ? "brakingPowerDelta" : "corneringSpeedDelta";
}

/** Resolved catalog projection for one exact instance; shared definitions stay immutable. */
export function definitionForLiveInstance(instance: ItemInstance, definition: ItemDefinition): ItemDefinition {
  let physics = { ...(definition.physics ?? {}) };
  let conditionalPhysics = definition.conditionalPhysics?.map((entry) => ({
    ...entry,
    delta: { ...entry.delta },
  }));
  let improvisedBehavior = definition.improvisedBehavior;
  if (instance.modification) {
    const effect = resolveModificationEffect(instance.modification, definition);
    if (instance.modification.kind === "twin-tuned") {
      physics = scaledDelta(physics, 2);
      conditionalPhysics = conditionalPhysics?.map((entry) => ({ ...entry, delta: scaledDelta(entry.delta, 2) }));
    } else if (instance.modification.kind === "stat-graft") {
      const sourceKey = statDeltaKey(instance.modification.sourceStat);
      const targetKey = statDeltaKey(instance.modification.targetStat);
      const source = physics[sourceKey] ?? 0;
      if (source !== 0) physics[targetKey] = (physics[targetKey] ?? 0) + source;
      conditionalPhysics = conditionalPhysics?.map((entry) => {
        const conditionalSource = entry.delta[sourceKey] ?? 0;
        return conditionalSource === 0 ? entry : {
          ...entry,
          delta: { ...entry.delta, [targetKey]: (entry.delta[targetKey] ?? 0) + conditionalSource },
        };
      });
    }
    if (effect.adaptedMount) improvisedBehavior = definition.fittedBehavior;
  }
  const scrutineeringFactor = 1 + instance.scrutineeringBonusPercent / 100;
  if (scrutineeringFactor !== 1) {
    physics = scaledDelta(physics, scrutineeringFactor);
    conditionalPhysics = conditionalPhysics?.map((entry) => ({ ...entry, delta: scaledDelta(entry.delta, scrutineeringFactor) }));
  }
  return { ...definition, physics, conditionalPhysics, improvisedBehavior };
}

/**
 * Compatibility boundary for Feature 034's live migration. The race engine
 * continues to consume resolved catalog definitions while every run mutation
 * is anchored by the parallel stable ItemInstance identity.
 */

export function emptyInstanceBuild(build: VehicleBuild): InstanceBuild {
  return {
    vehicleId: build.vehicleId,
    car: build.car,
    slots: build.slots.map((slot) => ({
      slotId: slot.slotId,
      slotType: slot.slotType,
      instance: null,
    })),
    storage: build.storage.map((position) => ({ index: position.index, instance: null })),
  };
}

export interface InstanceSequence {
  runId: string;
  nextOrdinal: number;
}

/** Allocates instance authority once for a run's pre-existing starting build. */
export function initializeLiveBuild(build: VehicleBuild, runId: string): ReconcileLiveInstancesResult {
  return reconcileLiveInstances(build, build, emptyInstanceBuild(build), { runId, nextOrdinal: 1 }, "draft");
}

function freshInstance(
  sequence: InstanceSequence,
  definitionId: string,
  provenance: InstanceProvenance,
  tier: 1 | 2 | 3,
): { instance: ItemInstance; nextOrdinal: number } {
  return {
    instance: {
      instanceId: `${sequence.runId}-item-${sequence.nextOrdinal}`,
      definitionId,
      tier,
      modification: null,
      scrutineeringBonusPercent: 0,
      provenance,
    },
    nextOrdinal: sequence.nextOrdinal + 1,
  };
}

export type ReconcileLiveInstancesResult =
  | { kind: "ok"; instanceBuild: InstanceBuild; build: VehicleBuild; nextOrdinal: number }
  | { kind: "legacy-unavailable"; reason: string };

/**
 * Reconciles one already-validated live garage mutation. Existing identities
 * survive moves, storage, tiering, and replacement; only genuinely new catalog
 * definitions allocate a run-scoped ID. Missing instance authority is rejected
 * rather than guessed.
 */
export function reconcileLiveInstances(
  previous: VehicleBuild,
  next: VehicleBuild,
  instances: InstanceBuild | undefined,
  sequence: InstanceSequence,
  provenance: InstanceProvenance,
): ReconcileLiveInstancesResult {
  if (!instances) return { kind: "legacy-unavailable", reason: "missing-instance-build" };
  const held = new Map<string, ItemInstance>();
  instances.slots.forEach((slot) => { if (slot.instance) held.set(slot.instance.instanceId, slot.instance); });
  instances.storage.forEach((position) => { if (position.instance) held.set(position.instance.instanceId, position.instance); });
  const previousByLocation = new Map<string, ItemInstance>();
  previous.slots.forEach((slot) => {
    if (slot.instanceId) {
      const instance = held.get(slot.instanceId);
      if (instance) previousByLocation.set(`v:${slot.slotId}`, instance);
    }
  });
  previous.storage.forEach((position) => {
    if (position.instanceId) {
      const instance = held.get(position.instanceId);
      if (instance) previousByLocation.set(`s:${position.index}`, instance);
    }
  });

  const claimed = new Set<string>();
  let ordinal = sequence.nextOrdinal;
  const resolve = (
    definition: ItemDefinition | null,
    tier: 1 | 2 | 3,
    requestedId: string | undefined,
    locationKey: string,
  ): ItemInstance | null => {
    if (!definition) return null;
    const exact = requestedId ? held.get(requestedId) : previousByLocation.get(locationKey);
    if (exact && exact.definitionId === definition.id && !claimed.has(exact.instanceId)) {
      claimed.add(exact.instanceId);
      return { ...exact, tier };
    }
    const movable = [...held.values()].find((candidate) =>
      candidate.definitionId === definition.id && candidate.tier === tier && !claimed.has(candidate.instanceId));
    if (movable) {
      claimed.add(movable.instanceId);
      return movable;
    }
    const created = freshInstance({ runId: sequence.runId, nextOrdinal: ordinal }, definition.id, provenance, tier);
    ordinal = created.nextOrdinal;
    claimed.add(created.instance.instanceId);
    return created.instance;
  };

  const nextSlots = next.slots.map((slot) => {
    const instance = resolve(slot.item, slot.tier, slot.instanceId, `v:${slot.slotId}`);
    return { ...slot, instanceId: instance?.instanceId };
  });
  const nextStorage = next.storage.map((position) => {
    const instance = resolve(position.item, position.tier, position.instanceId, `s:${position.index}`);
    return { ...position, instanceId: instance?.instanceId };
  });
  const instanceBuild: InstanceBuild = {
    vehicleId: next.vehicleId,
    car: next.car,
    slots: nextSlots.map((slot) => ({
      slotId: slot.slotId,
      slotType: slot.slotType,
      instance: slot.instanceId ? [...claimed].includes(slot.instanceId) ? held.get(slot.instanceId) ?? null : null : null,
    })),
    storage: nextStorage.map((position) => ({
      index: position.index,
      instance: position.instanceId ? held.get(position.instanceId) ?? null : null,
    })),
  };
  // Newly allocated and tier-updated instances are not in `held`; rebuild from
  // the resolved location IDs to retain their exact values.
  const resolvedById = new Map<string, ItemInstance>();
  nextSlots.forEach((slot, index) => {
    const item = next.slots[index].item;
    if (!item || !slot.instanceId) return;
    const existing = held.get(slot.instanceId);
    resolvedById.set(slot.instanceId, existing ? { ...existing, tier: slot.tier } : {
      instanceId: slot.instanceId, definitionId: item.id, tier: slot.tier,
      modification: null, scrutineeringBonusPercent: 0, provenance,
    });
  });
  nextStorage.forEach((position, index) => {
    const item = next.storage[index].item;
    if (!item || !position.instanceId) return;
    const existing = held.get(position.instanceId);
    resolvedById.set(position.instanceId, existing ? { ...existing, tier: position.tier } : {
      instanceId: position.instanceId, definitionId: item.id, tier: position.tier,
      modification: null, scrutineeringBonusPercent: 0, provenance,
    });
  });
  return {
    kind: "ok",
    nextOrdinal: ordinal,
    build: { ...next, slots: nextSlots, storage: nextStorage },
    instanceBuild: {
      ...instanceBuild,
      slots: instanceBuild.slots.map((slot, index) => ({ ...slot, instance: nextSlots[index].instanceId ? resolvedById.get(nextSlots[index].instanceId!) ?? null : null })),
      storage: instanceBuild.storage.map((position, index) => ({ ...position, instance: nextStorage[index].instanceId ? resolvedById.get(nextStorage[index].instanceId!) ?? null : null })),
    },
  };
}

export function projectInstanceBuild(
  instances: InstanceBuild,
  catalog: ReadonlyMap<string, ItemDefinition>,
): VehicleBuild | null {
  const resolve = (instance: ItemInstance | null): ItemDefinition | null | undefined => {
    if (!instance) return null;
    const definition = catalog.get(instance.definitionId);
    return definition ? definitionForLiveInstance(instance, definition) : undefined;
  };
  const slotItems = instances.slots.map((slot) => resolve(slot.instance));
  const storedItems = instances.storage.map((position) => resolve(position.instance));
  if (slotItems.some((item) => item === undefined) || storedItems.some((item) => item === undefined)) return null;
  return {
    vehicleId: instances.vehicleId,
    car: instances.car,
    slots: instances.slots.map((slot, index) => ({
      slotId: slot.slotId,
      slotType: slot.slotType,
      item: slotItems[index] ?? null,
      tier: slot.instance?.tier ?? 1,
      instanceId: slot.instance?.instanceId,
    })),
    storage: instances.storage.map((position, index) => ({
      index: position.index,
      item: storedItems[index] ?? null,
      tier: position.instance?.tier ?? 1,
      instanceId: position.instance?.instanceId,
    })),
  };
}
