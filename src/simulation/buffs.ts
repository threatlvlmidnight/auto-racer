import { firesOnLap } from "./laps";
import type { IdentityTag, OfferedItem } from "./types";

export type StackingState = Record<number, number>;

export interface LapBoosts {
  boostsByTag: Partial<Record<IdentityTag, number>>;
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

export function computeBoostsForLap(
  activeItems: OfferedItem[],
  allHeldItems: OfferedItem[],
  lap: number,
  incomingState: StackingState
): LapBoosts {
  const boostsByTag: Partial<Record<IdentityTag, number>> = {};
  const stackingState = { ...incomingState };

  activeItems.forEach((item, index) => {
    if (!item.buff || !item.identityTag) return;

    let applicableBoost: number;
    if (isCountSynergyBuff(item)) {
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
  });

  return { boostsByTag, stackingState };
}