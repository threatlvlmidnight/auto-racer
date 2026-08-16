import { MODIFICATION_SPECS, type ModificationSpec } from "../content/itemModifications";
import { authoredTierOneCanonical } from "./statNormalization";
import type { CanonicalPhysicalStats, ItemDefinition, ItemInstance, WorkshopModification } from "./types";

/**
 * Modification resolution, replacement, tier interaction, and contribution
 * attribution (034 tasks T031/T035, spec FR-043/FR-044). A modification is bound
 * to one exact ItemInstance; behavior is derived from the item's tier-1
 * authored canonical value, then tier scaling is applied afterward so tier
 * upgrades preserve and scale both the base and modification layers.
 */

export interface ModificationEffect {
  /** Canonical stat points this modification adds (at tier-1 scale, before tier scaling). */
  points: CanonicalPhysicalStats;
  /** Guarded: converts the first otherwise-successful overtake into a defended attempt, once per race. */
  guardedOncePerRace: boolean;
  /** Adapted Mount: retains the item's Fitted behavior while installed Improvised. */
  adaptedMount: boolean;
}

export const NO_MODIFICATION_EFFECT: ModificationEffect = {
  points: { acceleration: 0, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 },
  guardedOncePerRace: false,
  adaptedMount: false,
};

function emptyPoints(): CanonicalPhysicalStats {
  return { acceleration: 0, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 };
}

/**
 * Resolves the exact behavior a modification contributes for one item. Pure and
 * deterministic; tier scaling is applied by the caller (statNormalization
 * ledger), never folded in here.
 */
export function resolveModificationEffect(
  modification: WorkshopModification,
  item: ItemDefinition,
): ModificationEffect {
  const points = emptyPoints();
  const authored = authoredTierOneCanonical(item);
  switch (modification.kind) {
    case "stat-graft": {
      // FR-043: a tier-1 source contribution of N points produces N target
      // points in the canonical scale — a 1:1 graft with no exchange ratio.
      const source = authored[modification.sourceStat] ?? 0;
      if (modification.targetStat !== modification.sourceStat && source !== 0) {
        points[modification.targetStat] += source;
      }
      return { points, guardedOncePerRace: false, adaptedMount: false };
    }
    case "twin-tuned": {
      // FR-044: doubles all signed base physical-stat contributions — add the
      // authored base again on the modification layer.
      const authoredCopy = authoredTierOneCanonical(item);
      return {
        points: { ...authoredCopy },
        guardedOncePerRace: false,
        adaptedMount: false,
      };
    }
    case "guarded":
      return { points, guardedOncePerRace: true, adaptedMount: false };
    case "adapted-mount":
      return { points, guardedOncePerRace: false, adaptedMount: true };
  }
}

export interface ModificationCompatibility {
  legal: boolean;
  noOp: boolean;
}

function hasPhysicalContribution(item: ItemDefinition): boolean {
  const authored = authoredTierOneCanonical(item);
  return Object.values(authored).some((value) => value !== 0);
}

/** Checks a modification against an item: legal and non-no-op (SC-010). */
export function compatibilityFor(item: ItemDefinition, spec: ModificationSpec): ModificationCompatibility {
  const authored = authoredTierOneCanonical(item);
  switch (spec.kind) {
    case "stat-graft":
      return {
        legal: (authored[spec.sourceStat] ?? 0) !== 0 && spec.sourceStat !== spec.targetStat,
        noOp: (authored[spec.sourceStat] ?? 0) === 0 || spec.sourceStat === spec.targetStat,
      };
    case "twin-tuned":
      return { legal: hasPhysicalContribution(item), noOp: !hasPhysicalContribution(item) };
    case "guarded":
      return { legal: true, noOp: false };
    case "adapted-mount":
      return { legal: item.fittedBehavior.kind !== "none", noOp: item.fittedBehavior.kind === "none" };
  }
}

/** All compatible, non-no-op modifications offered for an item (Factory Development). */
export function offeredModificationsFor(item: ItemDefinition): readonly ModificationSpec[] {
  return MODIFICATION_SPECS.filter((spec) => {
    const result = compatibilityFor(item, spec);
    return result.legal && !result.noOp;
  });
}

/** Attaches a modification to an instance, replacing any existing one (FR one-slot). */
export function attachModification(instance: ItemInstance, modification: WorkshopModification): ItemInstance {
  const updated: ItemInstance = { ...instance };
  updated.modification = { ...modification };
  return updated;
}

/** Removes the modification bound to an instance (sale/surrender/rebuild path). */
export function clearModification(instance: ItemInstance): ItemInstance {
  const updated: ItemInstance = { ...instance };
  updated.modification = null;
  return updated;
}

/** The modification points layer for the stat/canonical ledger, or none. */
export function modificationPointsFor(instance: ItemInstance, item: ItemDefinition): CanonicalPhysicalStats {
  if (!instance.modification) return emptyPoints();
  const effect = resolveModificationEffect(instance.modification, item);
  return effect.points;
}
