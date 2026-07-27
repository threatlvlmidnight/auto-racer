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

export function computeBoostsForLap(
  activeItems: OfferedItem[],
  lap: number,
  incomingState: StackingState
): LapBoosts {
  const boostsByTag: Partial<Record<IdentityTag, number>> = {};
  const stackingState = { ...incomingState };

  activeItems.forEach((item, index) => {
    if (!item.buff || !item.identityTag) return;

    let applicableBoost = item.buff.boostPercent;
    if (item.cooldown !== undefined) {
      const previousBoost = stackingState[index] ?? 0;
      applicableBoost = firesOnLap(item.cooldown, lap)
        ? previousBoost + item.buff.boostPercent
        : previousBoost;
      stackingState[index] = applicableBoost;
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