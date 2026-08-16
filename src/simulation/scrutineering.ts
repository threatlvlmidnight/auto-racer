import type { InstanceBuild, ItemInstance } from "./types";

/**
 * Scrutineering — voluntary sacrifice for a next-scored-race beneficial bonus
 * (034 tasks T032/T042/T043/T044, spec FR-042/FR-049/FR-053). Formula, cap,
 * reservation, per-category coexistence, and exact return are all pure and
 * centralized so balance tests can inject coefficients.
 */

export interface ScrutineeringCoefficients {
  perTierMultiplier: number;
  priceAddendUnit: number;
  capPercent: number;
}

export const DEFAULT_SCRUTINEERING: ScrutineeringCoefficients = {
  perTierMultiplier: 5,
  priceAddendUnit: 1,
  capPercent: 25,
};

/**
 * FR-042: bonus = `5% × surrendered tier + surrendered authored price`,
 * capped at `capPercent` (cumulative) per target item.
 */
export function scrutineeringBonusPercent(
  surrenderedTier: number,
  surrenderedPrice: number,
  coefficients: ScrutineeringCoefficients = DEFAULT_SCRUTINEERING,
): number {
  const raw = coefficients.perTierMultiplier * surrenderedTier + coefficients.priceAddendUnit * surrenderedPrice;
  return Math.min(coefficients.capPercent, raw);
}

export interface ScrutineeringTemplate {
  surrenderedInstanceId: string;
  reservedSlotId: string;
  /** Installed target instances snapshotted at commitment (other installed items). */
  targetInstanceIds: readonly string[];
  /** Percent applied to each target; always ≤ cap. */
  computedPercentPerTarget: number;
  coefficients: ScrutineeringCoefficients;
  /** Global stage at which the commitment happened. */
  committedAtStage: number;
}

export type ScrutineeringBuildResult =
  | { kind: "committed"; template: ScrutineeringTemplate; build: InstanceBuild }
  | { kind: "unavailable"; reason: "no-installed-source" | "no-installed-target" | "slot-reserved" };

export function isInstalledSlot(slotId: string, build: InstanceBuild): boolean {
  const slot = build.slots.find((candidate) => candidate.slotId === slotId);
  return Boolean(slot && slot.instance);
}

export interface SlotReservation {
  pendingEffectId: string;
  slotId: string;
  surrenderedInstanceId: string;
}

/** One Scrutineering impound reserves its exact source slot (FR-053). */
export function isSlotReserved(reservations: readonly SlotReservation[], slotId: string): boolean {
  return reservations.some((reservation) => reservation.slotId === slotId);
}

export type PendingEffectCategory = "sponsor" | "scrutineering";

/**
 * FR-049: one unresolved effect per category may coexist; a second of the same
 * category makes that category's encounter ineligible until the first resolves.
 */
export function pendingEligible(
  pending: readonly PendingEffectCategory[],
  category: PendingEffectCategory,
): boolean {
  return pending.filter((entry) => entry === category).length === 0;
}

/** Resolves an instance's authored price from the caller-owned catalog. */
export type PriceResolver = (instance: ItemInstance) => number;

/**
 * Impounds one selected installed instance, marks the *other* currently
 * installed instances with the computed Scrutineering bonus, and reserves the
 * source slot. Accepts a price resolver so the authored-price component of the
 * formula (FR-042) is driven by the real catalog in production and by fixture
 * prices in tests.
 */
export function commitScrutineering(
  build: InstanceBuild,
  surrenderedSlotId: string,
  committedAtStage: number,
  coefficients: ScrutineeringCoefficients = DEFAULT_SCRUTINEERING,
  resolvePrice: PriceResolver = () => 0,
): ScrutineeringBuildResult {
  const source = build.slots.find((slot) => slot.slotId === surrenderedSlotId);
  if (!source || !source.instance) return { kind: "unavailable", reason: "no-installed-source" };

  const targets = build.slots.filter((slot) => slot.instance && slot.slotId !== surrenderedSlotId);
  if (targets.length === 0) return { kind: "unavailable", reason: "no-installed-target" };

  const surrendered = source.instance;
  const percent = scrutineeringBonusPercent(surrendered.tier, resolvePrice(surrendered), coefficients);

  const updatedSlots = build.slots.map((slot) => {
    if (slot.slotId === surrenderedSlotId) {
      // Surrendered item leaves the slot for the next scored race.
      return { ...slot, instance: null };
    }
    if (slot.instance) {
      const cumulative = Math.min(
        coefficients.capPercent,
        slot.instance.scrutineeringBonusPercent + percent,
      );
      return { ...slot, instance: { ...slot.instance, scrutineeringBonusPercent: cumulative } };
    }
    return slot;
  });

  return {
    kind: "committed",
    template: {
      surrenderedInstanceId: surrendered.instanceId,
      reservedSlotId: surrenderedSlotId,
      targetInstanceIds: targets.map((slot) => (slot.instance as ItemInstance).instanceId),
      computedPercentPerTarget: percent,
      coefficients,
      committedAtStage,
    },
    build: { ...build, slots: updatedSlots },
  };
}

/**
 * Settles the next scored race by returning the exact impounded instance to the
 * reserved slot before clearing the effect (034 T044, FR-053). Pure. Returns a
 * typed failure rather than mutating when the slot is now occupied by another
 * instance (typed recovery).
 */
export function settleScrutineering(
  build: InstanceBuild,
  reservation: SlotReservation,
  recoveredInstance: ItemInstance,
): { kind: "settled"; build: InstanceBuild } | { kind: "occupied"; reason: string } {
  const slotIndex = build.slots.findIndex((slot) => slot.slotId === reservation.slotId);
  const slot = build.slots[slotIndex];
  if (!slot) return { kind: "occupied", reason: "unknown-slot" };
  if (slot.instance && slot.instance.instanceId !== reservation.surrenderedInstanceId) {
    return { kind: "occupied", reason: "slot-occupied" };
  }
  const updated = build.slots.map((candidate, index) => {
    if (index === slotIndex) {
      return { ...candidate, instance: { ...recoveredInstance, scrutineeringBonusPercent: 0 } };
    }
    return candidate.instance
      ? { ...candidate, instance: { ...candidate.instance, scrutineeringBonusPercent: 0 } }
      : candidate;
  });
  return { kind: "settled", build: { ...build, slots: updated } };
}
