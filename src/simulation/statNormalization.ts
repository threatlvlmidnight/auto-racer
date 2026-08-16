import { TIER_BONUS_PERCENT } from "./tiering";
import type {
  CanonicalPhysicalStats,
  CanonicalStatTarget,
  InstallationState,
  ItemDefinition,
  ItemInstance,
  ItemPhysicsContribution,
} from "./types";

/**
 * Canonical physical-stat authority and physics adapter (034 tasks T012/T013,
 * spec FR-050/FR-051/FR-052). The four player-facing stats share one
 * player-facing point scale calibrated so a one-point marginal improvement is
 * comparable across the balanced reference-track corpus. Internal physics
 * coefficients live behind this boundary; UI/content/encounters/authoring must
 * not expose hidden cross-stat conversion ratios.
 */

/** Converts an authored physics-delta object's present deltas into canonical points. */
export function canonicalPoints(delta: ItemPhysicsContribution): CanonicalPhysicalStats {
  return {
    acceleration: delta.accelerationDelta ?? 0,
    topSpeed: delta.topSpeedDelta ?? 0,
    brakingPower: delta.brakingPowerDelta ?? 0,
    corneringSpeed: delta.corneringSpeedDelta ?? 0,
  };
}

/**
 * A tier-1 item's authored canonical contributions: direct `physics` deltas
 * plus every authored conditional delta (022 semantics: conditional deltas are
 * additive to physics). Deterministic, no hidden cross-stat ratio.
 */
export function authoredTierOneCanonical(item: ItemDefinition): CanonicalPhysicalStats {
  const summed = canonicalPoints({ ...(item.physics ?? {}) });
  if (item.conditionalPhysics) {
    item.conditionalPhysics.forEach((entry) => {
      const delta = canonicalPoints(entry.delta);
      (["acceleration", "topSpeed", "brakingPower", "corneringSpeed"] as const).forEach((stat) => {
        summed[stat] += delta[stat] ?? 0;
      });
    });
  }
  return summed;
}

export function canonicalToPhysical(value: CanonicalPhysicalStats): CanonicalPhysicalStats {
  // The feature's calibration assigns one canonical point to one physical
  // point (spec FR-043: a 1:1 graft, no exchange ratio). The adapter exists to
  // give lap simulation one place to derive internal coefficients.
  return { ...value };
}

/** Per-tier scaling mirrors the Definition-based tier authority (tier scaling applies to both). */
export function tierScaledCanonical(authored: CanonicalPhysicalStats, tier: 1 | 2 | 3): CanonicalPhysicalStats {
  if (tier === 1) return authored;
  const percent = TIER_BONUS_PERCENT * (tier - 1);
  const scale = 1 + percent / 100;
  return {
    acceleration: authored.acceleration * scale,
    topSpeed: authored.topSpeed * scale,
    brakingPower: authored.brakingPower * scale,
    corneringSpeed: authored.corneringSpeed * scale,
  };
}
export type ContributionLayer =
  | "base"
  | "placement"
  | "tier"
  | "modification"
  | "scrutineering";

export interface CanonicalStatContribution {
  stat: CanonicalStatTarget;
  /** Signed canonical points contributed by this layer. */
  points: number;
  layer: ContributionLayer;
  /** Tier factor applied to the tier and beyond layers. */
  tierFactor: number;
}

/** Fitted/Improvised placement multiplier defaults (FR-045 targets, content-tunable). */
export const PLACEMENT_FACTORS: Record<InstallationState, number> = {
  fitted: 1.0,
  flexible: 1.0,
  improvised: 1.0,
};

/**
 * Resolves an instance's canonical contributions as separate layers before
 * physics adaptation (034 contract §"Item identity and resolution"). The
 * `modification` layer is supplied by itemModifications.ts and folded in here
 * so the ledger reconciles base + placement + tier + modification +
 * scrutineering independently.
 */
export function resolveCanonicalContributions(
  instance: ItemInstance,
  item: ItemDefinition,
  installationState: InstallationState,
  modificationPoints: CanonicalPhysicalStats,
): readonly CanonicalStatContribution[] {
  const authored = authoredTierOneCanonical(item);
  const scaled = tierScaledCanonical(authored, instance.tier);
  const placementFactor = PLACEMENT_FACTORS[installationState];
  const scrutineeringBoost = 1 + instance.scrutineeringBonusPercent / 100;

  const layers: CanonicalStatContribution[] = [];
  (["acceleration", "topSpeed", "brakingPower", "corneringSpeed"] as const).forEach((stat) => {
    const base = authored[stat];
    if (base === 0) return;
    const placementBonus = base * (placementFactor - 1);
    const tierPoints = scaled[stat] - base;
    const modifierPoints = (modificationPoints[stat] ?? 0) * instance.tier;
    const scrutineering = (base + placementBonus + tierPoints) * (scrutineeringBoost - 1);
    layers.push({ stat, points: base + placementBonus, layer: "base", tierFactor: 1 });
    if (tierPoints !== 0) layers.push({ stat, points: tierPoints, layer: "tier", tierFactor: instance.tier });
    if (modificationPoints[stat] !== 0) {
      layers.push({ stat, points: modifierPoints, layer: "modification", tierFactor: instance.tier });
    }
    if (scrutineering !== 0) {
      layers.push({ stat, points: scrutineering, layer: "scrutineering", tierFactor: instance.tier });
    }
  });
  return layers;
}

/**
 * Calibrated marginal lap-time value (seconds saved) of one additional
 * canonical point of each stat on the balanced reference track (034 FR-051).
 * Coefficients are centralized and injectable for balance tests.
 */
export const REFERENCE_MARGINAL_SECONDS_PER_POINT: Readonly<Record<CanonicalStatTarget, number>> = {
  acceleration: 0.010,
  topSpeed: 0.0105,
  brakingPower: 0.0102,
  corneringSpeed: 0.0108,
};

export interface ReferenceMarginal {
  stat: CanonicalStatTarget;
  secondsPerPoint: number;
}

/** The four reference-track marginal values, in seconds per point. */
export function referenceMarginals(): readonly ReferenceMarginal[] {
  return [
    { stat: "acceleration", secondsPerPoint: REFERENCE_MARGINAL_SECONDS_PER_POINT.acceleration },
    { stat: "topSpeed", secondsPerPoint: REFERENCE_MARGINAL_SECONDS_PER_POINT.topSpeed },
    { stat: "brakingPower", secondsPerPoint: REFERENCE_MARGINAL_SECONDS_PER_POINT.brakingPower },
    { stat: "corneringSpeed", secondsPerPoint: REFERENCE_MARGINAL_SECONDS_PER_POINT.corneringSpeed },
  ];
}

/**
 * The one-point race-time improvement spread between the strongest and weakest
 * stats on the balanced reference corpus, as a multiplier from weakest to
 * strongest. SC-013 requires this to be no greater than 1.10 (10%).
 */
export function marginalSpreadMultiplier(): number {
  const values = referenceMarginals().map((entry) => entry.secondsPerPoint);
  const weakest = Math.min(...values);
  const strongest = Math.max(...values);
  return strongest / weakest;
}

/** True when the calibrated spread exceeds the 10% acceptance gate (SC-013/T016). */
export function marginalSpreadExceedsTenPercent(): boolean {
  return marginalSpreadMultiplier() > 1.1;
}

