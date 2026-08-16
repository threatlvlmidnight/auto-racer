import type { CanonicalStatTarget, WorkshopModification } from "../simulation/types";

/**
 * Authored Workshop Modification catalog and presentation keys (034 T034,
 * spec FR-044). The catalog defines the four modification behaviors and their
 * authored presentation copy. Per-item compatibility is resolved dynamically by
 * `simulation/itemModifications.ts` so it stays legal and non-no-op for the
 * selected item (SC-010). Content here is the source of truth for behavior
 * classes; the simulation layer never re-invents copy.
 */

/** Stat-graft: adds N canonical target points where N is the item's tier-1 sourceStat contribution. */
export interface StatGraftSpec {
  modificationId: string;
  kind: "stat-graft";
  sourceStat: CanonicalStatTarget;
  targetStat: CanonicalStatTarget;
  presentationKey: string;
}

export interface TwinTunedSpec {
  modificationId: string;
  kind: "twin-tuned";
  presentationKey: string;
}

export interface GuardedSpec {
  modificationId: string;
  kind: "guarded";
  presentationKey: string;
}

export interface AdaptedMountSpec {
  modificationId: string;
  kind: "adapted-mount";
  presentationKey: string;
}

export type ModificationSpec = StatGraftSpec | TwinTunedSpec | GuardedSpec | AdaptedMountSpec;

/** The initial Feature 034 modification catalog (spec FR-044, SC-010: 3 distinct families). */
export const MODIFICATION_SPECS: readonly ModificationSpec[] = [
  // Stat-graft family (stat-graft): a 1-point source trades into 1 target point.
  { modificationId: "graft-accel-into-cornering", kind: "stat-graft", sourceStat: "acceleration", targetStat: "corneringSpeed", presentationKey: "mod.songraby" },
  { modificationId: "graft-topspeed-into-braking", kind: "stat-graft", sourceStat: "topSpeed", targetStat: "brakingPower", presentationKey: "mod.graft.top.brake" },
  { modificationId: "graft-cornering-into-top", kind: "stat-graft", sourceStat: "corneringSpeed", targetStat: "topSpeed", presentationKey: "mod.graft.corner.top" },
  // Doubling family (twin-tuned): doubles all signed base physical‑stat contributions.
  { modificationId: "twin-tuned", kind: "twin-tuned", presentationKey: "mod.twin" },
  // Overtake-defense family (guarded): first otherwise-successful overtake becomes a defended attempt, once per race.
  { modificationId: "guarded", kind: "guarded", presentationKey: "mod.defense" },
  // Placement family (adapted-mount): retains Fitted behavior while installed Improvised.
  { modificationId: "adapted-mount", kind: "adapted-mount", presentationKey: "mod.mount" },
] as const;

export function specById(modificationId: string): ModificationSpec | undefined {
  return MODIFICATION_SPECS.find((spec) => spec.modificationId === modificationId);
}

/**
 * Builds a concrete, run-bound WorkshopModification for a presentation key. The
 * returned instance carries the source encounter and stage for provenance.
 */
export function buildWorkshopModification(
  modificationId: string,
  sourceEncounterId: string,
  appliedAtStage: number,
): WorkshopModification {
  const spec = specById(modificationId);
  if (!spec) throw new RangeError(`Unknown modification spec: ${modificationId}`);
  const common = { modificationId, sourceEncounterId, appliedAtStage, presentationKey: spec.presentationKey };
  switch (spec.kind) {
    case "stat-graft":
      return { ...common, kind: "stat-graft", sourceStat: spec.sourceStat, targetStat: spec.targetStat };
    case "twin-tuned":
      return { ...common, kind: "twin-tuned" };
    case "guarded":
      return { ...common, kind: "guarded" };
    case "adapted-mount":
      return { ...common, kind: "adapted-mount" };
  }
}
