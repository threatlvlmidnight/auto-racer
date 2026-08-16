import type { ModificationSpec } from "../content/itemModifications";
import { enumerateInstances, type HeldInstanceEntry } from "./itemInstances";
import { offeredModificationsFor } from "./itemModifications";
import { upgradeInstance } from "./encounterTransactions";
import type { InstanceBuild, ItemDefinition, ItemTier } from "./types";

/**
 * Deterministic, item-first offer generation for the Feature 034 build-changing
 * encounters (034 tasks T038–T041). Pure: reads an instance build + catalog and
 * returns exact offer candidates; confirmation applies through the atomic
 * transaction layer (encounterTransactions.ts). No scene/run mutation here.
 */

// --- T038 Factory Development: item-first compatible modification offers ----

export interface FactoryDevelopmentOffer {
  instanceId: string;
  definitionId: string;
  itemName: string;
  modifications: readonly ModificationSpec[];
}

/** Every held instance with at least one compatible, non-no-op modification. */
export function factoryDevelopmentOffers(
  build: InstanceBuild,
  catalog: ReadonlyMap<string, ItemDefinition>,
): readonly FactoryDevelopmentOffer[] {
  const offers: FactoryDevelopmentOffer[] = [];
  enumerateInstances(build).forEach((entry) => {
    const definition = catalog.get(entry.instance.definitionId);
    if (!definition) return;
    const modifications = offeredModificationsFor(definition);
    if (modifications.length === 0) return;
    offers.push({
      instanceId: entry.instance.instanceId,
      definitionId: definition.id,
      itemName: definition.name,
      modifications,
    });
  });
  return offers;
}

// --- T039 Upgrade Workshop: free single-item tier upgrade -------------------

/** Held instances below max tier — legal free-upgrade targets (FR-046). */
export function upgradeWorkshopCandidates(build: InstanceBuild): readonly HeldInstanceEntry[] {
  return enumerateInstances(build).filter((entry) => entry.instance.tier < 3);
}

/** Upgrades the exact instance in place (returns a new build), rejecting at max tier. */
export function upgradeWorkshopFree(
  build: InstanceBuild,
  instanceId: string,
): { kind: "ok"; build: InstanceBuild; toTier: ItemTier } | { kind: "failure"; code: string } {
  const entry = enumerateInstances(build).find((candidate) => candidate.instance.instanceId === instanceId);
  if (!entry) return { kind: "failure", code: "missing-instance" };
  const upgraded = upgradeInstance(entry.instance);
  if (upgraded.kind === "failure") return { kind: "failure", code: "max-tier" };
  if (entry.installed) {
    return {
      kind: "ok",
      toTier: upgraded.value.tier,
      build: {
        ...build,
        slots: build.slots.map((slot) => (slot.slotId === (entry.location as { area: "vehicle"; slotId: string }).slotId ? { ...slot, instance: upgraded.value } : slot)),
      },
    };
  }
  return {
    kind: "ok",
    toTier: upgraded.value.tier,
    build: {
      ...build,
      storage: build.storage.map((position) => (position.index === (entry.location as { area: "storage"; index: number }).index ? { ...position, instance: upgraded.value } : position)),
    },
  };
}

// --- T040 Privateer Exchange: same-tier, foreign-origin candidates ----------

/** Foreign-origin definitions at the same tier as the source (T040). */
export function privateerExchangeCandidates(
  sourceDef: ItemDefinition,
  crossOriginPool: readonly ItemDefinition[],
  limit = 3,
): readonly ItemDefinition[] {
  return crossOriginPool.filter(
    (definition) => definition.origin !== sourceDef.origin && definition.id !== sourceDef.id,
  ).slice(0, limit);
}

// --- T041 Experimental Rebuild: three same-category, +1-tier replacements ----

/**
 * Three deterministic replacements in the source's installation category at one
 * tier above (FR-047). Takes the first three matching definitions so callers can
 * seed/order the pool deterministically.
 */
export function rebuildCandidates(
  sourceDef: ItemDefinition,
  sourceTier: ItemTier,
  categoryPool: readonly ItemDefinition[],
  count = 3,
): readonly ItemDefinition[] {
  if (sourceTier === 3) return [];
  return categoryPool
    .filter((definition) => definition.installationCategory === sourceDef.installationCategory && definition.id !== sourceDef.id)
    .slice(0, count);
}
