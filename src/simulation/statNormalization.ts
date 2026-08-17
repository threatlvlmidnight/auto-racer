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

/**
 * Physical units represented by one player-facing canonical point. These
 * were measured against STOCK_PHYSICAL_STATS on the deterministic reference
 * corpus in tests/fixtures/balance-fixtures.ts. They are deliberately not
 * display units: authored content remains in physical units and crosses this
 * adapter exactly once before it is shown or combined with other sources.
 */
export const PHYSICAL_UNITS_PER_CANONICAL_POINT: Readonly<CanonicalPhysicalStats> = {
  acceleration: 1.01,
  topSpeed: 0.13,
  brakingPower: 2.16,
  corneringSpeed: 0.25,
};

/** Converts an authored physical-delta object into player-facing canonical points. */
export function canonicalPoints(delta: ItemPhysicsContribution): CanonicalPhysicalStats {
  return {
    acceleration: (delta.accelerationDelta ?? 0) / PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration,
    topSpeed: (delta.topSpeedDelta ?? 0) / PHYSICAL_UNITS_PER_CANONICAL_POINT.topSpeed,
    brakingPower: (delta.brakingPowerDelta ?? 0) / PHYSICAL_UNITS_PER_CANONICAL_POINT.brakingPower,
    corneringSpeed: (delta.corneringSpeedDelta ?? 0) / PHYSICAL_UNITS_PER_CANONICAL_POINT.corneringSpeed,
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
  const physical = (points: number, unitsPerPoint: number): number =>
    Math.round(points * unitsPerPoint * 1e12) / 1e12;
  return {
    acceleration: physical(value.acceleration, PHYSICAL_UNITS_PER_CANONICAL_POINT.acceleration),
    topSpeed: physical(value.topSpeed, PHYSICAL_UNITS_PER_CANONICAL_POINT.topSpeed),
    brakingPower: physical(value.brakingPower, PHYSICAL_UNITS_PER_CANONICAL_POINT.brakingPower),
    corneringSpeed: physical(value.corneringSpeed, PHYSICAL_UNITS_PER_CANONICAL_POINT.corneringSpeed),
  };
}

/** Converts a full physical stat profile to the same canonical display scale. */
export function physicalStatsToCanonical(value: CanonicalPhysicalStats): CanonicalPhysicalStats {
  return canonicalPoints({
    accelerationDelta: value.acceleration,
    topSpeedDelta: value.topSpeed,
    brakingPowerDelta: value.brakingPower,
    corneringSpeedDelta: value.corneringSpeed,
  });
}

/** Adapts canonical points back to the four-field delta shape consumed by physics. */
export function physicalDeltaFromCanonical(value: CanonicalPhysicalStats): ItemPhysicsContribution {
  const physical = canonicalToPhysical(value);
  const delta: ItemPhysicsContribution = {};
  if (value.acceleration !== 0) delta.accelerationDelta = physical.acceleration;
  if (value.topSpeed !== 0) delta.topSpeedDelta = physical.topSpeed;
  if (value.brakingPower !== 0) delta.brakingPowerDelta = physical.brakingPower;
  if (value.corneringSpeed !== 0) delta.corneringSpeedDelta = physical.corneringSpeed;
  return delta;
}

/** Adds canonical values without letting raw physical deltas bypass the boundary. */
export function addCanonical(...values: readonly CanonicalPhysicalStats[]): CanonicalPhysicalStats {
  return values.reduce<CanonicalPhysicalStats>((sum, value) => ({
    acceleration: sum.acceleration + value.acceleration,
    topSpeed: sum.topSpeed + value.topSpeed,
    brakingPower: sum.brakingPower + value.brakingPower,
    corneringSpeed: sum.corneringSpeed + value.corneringSpeed,
  }), { acceleration: 0, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 });
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
  acceleration: 0.035607,
  topSpeed: 0.035314,
  brakingPower: 0.033486,
  corneringSpeed: 0.034835,
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
