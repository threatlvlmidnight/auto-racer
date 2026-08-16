import type {
  InstanceBuild,
  InstanceProvenance,
  ItemDefinition,
  ItemInstance,
  ItemTier,
} from "./types";

/**
 * Stable run-scoped item identity and definition lookup (034 tasks T006/T007).
 * Every identity-aware mutation targets an `ItemInstance` — the shared catalog
 * `ItemDefinition` remains immutable. Identity is created once by an
 * authoritative source (draft/encounter) and preserves its `instanceId` across
 * every move, store, tier change, modification, and race; sale/surrender
 * removes the instance and its modification.
 */

let instanceCounter = 0;

/** Creates a fresh stable instance id, unique within a run. */
export function nextInstanceId(): string {
  instanceCounter += 1;
  return `item-${instanceCounter.toString(36)}`;
}

/** Run-scoped counter reset for deterministic replay tests. */
export function resetInstanceIds(): void {
  instanceCounter = 0;
}

/**
 * Constructs a new held-item instance from a definition id. `tier` defaults to
 * 1, no modification, no Scrutineering bonus.
 */
export function createItemInstance(
  definitionId: string,
  provenance: InstanceProvenance,
  tier: ItemTier = 1,
): ItemInstance {
  return {
    instanceId: nextInstanceId(),
    definitionId,
    tier,
    modification: null,
    scrutineeringBonusPercent: 0,
    provenance,
  };
}

export interface HeldInstanceEntry {
  instance: ItemInstance;
  location: { area: "vehicle"; slotId: string } | { area: "storage"; index: number };
  installed: boolean;
}

/**
 * Enumerates every held instance — installed slots first (slot order), then
 * storage (index order) — with exact location evidence. Mirrors the
 * Definition-based `enumerateHeldItems` for the instance layer.
 */
export function enumerateInstances(build: InstanceBuild): readonly HeldInstanceEntry[] {
  const entries: HeldInstanceEntry[] = [];
  build.slots.forEach((slot) => {
    if (slot.instance) {
      entries.push({ instance: slot.instance, location: { area: "vehicle", slotId: slot.slotId }, installed: true });
    }
  });
  build.storage.forEach((position) => {
    if (position.instance) {
      entries.push({ instance: position.instance, location: { area: "storage", index: position.index }, installed: false });
    }
  });
  return entries;
}

/**
 * Resolves the immutable catalog definition for a held instance. Returns null
 * when the definition id has no authored entry (a stale/unknown version).
 */
export function definitionFor(instance: ItemInstance, catalog: ReadonlyMap<string, ItemDefinition>): ItemDefinition | null {
  return catalog.get(instance.definitionId) ?? null;
}

/** Finds a held instance by stable id across the whole build, or null. */
export function instanceById(build: InstanceBuild, instanceId: string): HeldInstanceEntry | null {
  return enumerateInstances(build).find((entry) => entry.instance.instanceId === instanceId) ?? null;
}

/** Clones an instance, preserving its exact identity and behavior. */
export function cloneInstance(instance: ItemInstance): ItemInstance {
  return { ...instance, modification: instance.modification ? { ...instance.modification } : null };
}
