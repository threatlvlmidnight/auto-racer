import { firesOnLap } from "./laps";
import { matchesTarget, resolveConditionPercent } from "./synergy";
import type { IdentityTag, ItemDefinition, ItemPhysicsContribution, OfferedItem, ScalingClassification, StatTarget, SynergyEffect } from "./types";

/** The four physical stats a Buff/SynergyEffect can target, excluding legacy "time". */
export type PhysicalStatTarget = Exclude<StatTarget, "time">;

export const DELTA_KEY_FOR_STAT: Record<PhysicalStatTarget, keyof ItemPhysicsContribution> = {
  acceleration: "accelerationDelta",
  topSpeed: "topSpeedDelta",
  brakingPower: "brakingPowerDelta",
  corneringSpeed: "corneringSpeedDelta",
};

/**
 * Structural eligibility check for a stat-targeted amplifier (023 research.md
 * Decision 2/6, contract §2): does the item's *authored* shape — flat
 * `physics` or any `conditionalPhysics` entry — carry a delta for this stat.
 * Never reads a track or corner condition; pure and deterministic.
 */
export function hasDeltaForStat(item: OfferedItem, stat: PhysicalStatTarget): boolean {
  const deltaKey = DELTA_KEY_FOR_STAT[stat];
  if (item.physics?.[deltaKey] !== undefined) return true;
  return (item.conditionalPhysics ?? []).some((contribution) => contribution.delta[deltaKey] !== undefined);
}

export type StackingState = Record<number, number>;

export interface LapBoosts {
  boostsByTag: Partial<Record<IdentityTag, number>>;
  /** 023-stat-targeted-amplifiers: accumulated percent per physical stat this lap. */
  boostsByStat: Partial<Record<PhysicalStatTarget, number>>;
  stackingState: StackingState;
}

export function isFlatBuff(item: OfferedItem): boolean {
  return !!item.buff && item.cooldown === undefined;
}

/** A buff whose applied boost scales with how many matching direct items are held (007-count-synergy-buff). */
export function isCountSynergyBuff(item: OfferedItem): boolean {
  return !!item.buff?.perCount;
}

/**
 * A buff whose applied boost scales with the summed authored `price` of
 * every currently fitted (vehicle-slot) item (020-character-item-pools).
 */
export function isValueScaledBuff(item: OfferedItem): boolean {
  return !!item.buff?.scalesWithFittedValue;
}

/** Sums `price` across fitted (vehicle-slot) items only — storage excluded (020-character-item-pools). */
export function sumFittedValue(fittedItems: readonly OfferedItem[]): number {
  return fittedItems.reduce((sum, item) => sum + item.price, 0);
}

/**
 * Count of items in allHeldItems that are not `item` itself, are not buffs,
 * and share `item`'s identity tag — the input driving a count-synergy buff's
 * boost. allHeldItems is expected to include inert storage items (unlike
 * activeItems), since the count spans everything held, active or not.
 */
export function matchingDirectItemCount(allHeldItems: OfferedItem[], item: OfferedItem): number {
  return allHeldItems.filter(
    (candidate) =>
      candidate !== item && !candidate.buff && candidate.identityTag === item.identityTag
  ).length;
}

/**
 * Stat-targeted counterpart to matchingDirectItemCount (023 research.md
 * Decision 2): counts other held items with a delta for `stat`, rather than
 * items sharing an identityTag. identityTag plays no role in stat-targeted
 * eligibility or counting (FR-005).
 */
export function matchingStatItemCount(allHeldItems: OfferedItem[], item: OfferedItem, stat: PhysicalStatTarget): number {
  return allHeldItems.filter((candidate) => candidate !== item && hasDeltaForStat(candidate, stat)).length;
}

/**
 * Feature 032 T019 (FR-005, research Decision 2): the audited scaling
 * vocabulary. Classifies one item's scaling-like rule as `composition`,
 * `fitted-value`, or `lap-activation` from the authored item plus the held
 * build (and retained lap evidence for stacking cadence). Returns null for
 * anything that is not scaling-like — direct effects, flat amplifiers,
 * economy placeholders, configurable controls. Pure and deterministic; no
 * cross-race/day persistence is ever implied (labels name inputs, not time).
 */
export interface ScalingClassificationContext {
  /** Every held item (installed + stored) — count-synergy counting spans storage. */
  heldItems: readonly ItemDefinition[];
  /** Installed (vehicle-slot) items only — synergy and fitted-value inputs. */
  installedItems: readonly ItemDefinition[];
  /** Retained lap evidence for stacking cooldown buffs, if playback has produced any. */
  lapActivations?: { activations: number; currentPercent: number };
}

function synergyNextTriggerLabel(effect: SynergyEffect): string {
  const targetLabel = effect.target.kind === "tag" ? effect.target.tag : effect.target.category;
  if (effect.condition.kind === "linear-per-count") {
    return `+${effect.condition.percentPerMatch}% per other matching ${targetLabel} item installed`;
  }
  return `Needs exactly ${effect.condition.count} other matching ${targetLabel} items for +${effect.condition.bonusPercent}%`;
}

export function classifyScalingItem(
  item: ItemDefinition,
  context: ScalingClassificationContext,
): ScalingClassification | null {
  const buff = item.buff;
  const targetStat: StatTarget = buff?.targetStat ?? "time";

  if (buff?.scalesWithFittedValue) {
    const fittedValue = sumFittedValue(context.installedItems);
    return {
      kind: "fitted-value",
      sourceItemId: item.id,
      targetStat,
      currentInput: fittedValue,
      currentMagnitude: buff.boostPercent * fittedValue,
      nextTriggerLabel: "Grows with the total price of installed parts",
    };
  }

  if (buff?.perCount) {
    const count = targetStat === "time"
      ? matchingDirectItemCount([...context.heldItems], item)
      : matchingStatItemCount([...context.heldItems], item, targetStat as PhysicalStatTarget);
    return {
      kind: "composition",
      sourceItemId: item.id,
      targetStat,
      currentInput: count,
      currentMagnitude: buff.boostPercent * count,
      nextTriggerLabel: `+${buff.boostPercent}% per other matching item held`,
    };
  }

  if (buff && item.cooldown !== undefined) {
    const evidence = context.lapActivations;
    const activations = evidence?.activations ?? 0;
    return {
      kind: "lap-activation",
      sourceItemId: item.id,
      targetStat,
      currentInput: activations,
      currentMagnitude: evidence?.currentPercent ?? activations * buff.boostPercent,
      nextTriggerLabel: `Fires every ${item.cooldown} laps — repeats, never persists`,
    };
  }

  const selfScaling = (item.synergyEffects ?? []).find((effect) => effect.appliesTo === "self");
  if (selfScaling) {
    const matchingInstalled = context.installedItems
      .filter((other) => other !== item && matchesTarget(other, selfScaling.target)).length;
    return {
      kind: "composition",
      sourceItemId: item.id,
      targetStat: selfScaling.targetStat ?? "time",
      currentInput: matchingInstalled,
      currentMagnitude: resolveConditionPercent(selfScaling.condition, matchingInstalled) ?? 0,
      nextTriggerLabel: synergyNextTriggerLabel(selfScaling),
    };
  }

  return null;
}


export function computeBoostsForLap(
  activeItems: OfferedItem[],
  allHeldItems: OfferedItem[],
  lap: number,
  incomingState: StackingState,
  /** 020-character-item-pools: summed price of fitted (vehicle-slot) items, for isValueScaledBuff. */
  fittedValue = 0,
): LapBoosts {
  const boostsByTag: Partial<Record<IdentityTag, number>> = {};
  const boostsByStat: Partial<Record<PhysicalStatTarget, number>> = {};
  const stackingState = { ...incomingState };

  activeItems.forEach((item, index) => {
    if (!item.buff) return;
    const targetStat = item.buff.targetStat ?? "time";

    if (targetStat === "time") {
      if (!item.identityTag) return;

      let applicableBoost: number;
      if (isValueScaledBuff(item)) {
        applicableBoost = item.buff.boostPercent * fittedValue;
      } else if (isCountSynergyBuff(item)) {
        applicableBoost = item.buff.boostPercent * matchingDirectItemCount(allHeldItems, item);
      } else if (item.cooldown !== undefined) {
        const previousBoost = stackingState[index] ?? 0;
        applicableBoost = firesOnLap(item.cooldown, lap)
          ? previousBoost + item.buff.boostPercent
          : previousBoost;
        stackingState[index] = applicableBoost;
      } else {
        applicableBoost = item.buff.boostPercent;
      }

      const hasMatchingDirectItem = activeItems.some(
        (candidate, candidateIndex) =>
          candidateIndex !== index && !candidate.buff && candidate.identityTag === item.identityTag
      );
      if (!hasMatchingDirectItem) return;

      boostsByTag[item.identityTag] = (boostsByTag[item.identityTag] ?? 0) + applicableBoost;
      return;
    }

    // Stat-targeted path (023 contract §2/§4). Identical accumulation shape
    // to the time-targeted path above — flat/count-synergy magnitude is
    // constant lap to lap; stacking grows (or, with a negative boostPercent,
    // shrinks) exactly like time-targeted stacking, just keyed by stat
    // (US2, research.md Decision 5/7 — this is what makes a build's
    // resolved PhysicalStats genuinely vary lap to lap for the first time).
    let applicableBoost: number;
    if (isValueScaledBuff(item)) {
      applicableBoost = item.buff.boostPercent * fittedValue;
    } else if (isCountSynergyBuff(item)) {
      applicableBoost = item.buff.boostPercent * matchingStatItemCount(allHeldItems, item, targetStat);
    } else if (item.cooldown !== undefined) {
      const previousBoost = stackingState[index] ?? 0;
      applicableBoost = firesOnLap(item.cooldown, lap)
        ? previousBoost + item.buff.boostPercent
        : previousBoost;
      stackingState[index] = applicableBoost;
    } else {
      applicableBoost = item.buff.boostPercent;
    }

    const hasEligibleCandidate = activeItems.some(
      (candidate, candidateIndex) => candidateIndex !== index && hasDeltaForStat(candidate, targetStat)
    );
    if (!hasEligibleCandidate) return;

    boostsByStat[targetStat] = (boostsByStat[targetStat] ?? 0) + applicableBoost;
  });

  return { boostsByTag, boostsByStat, stackingState };
}