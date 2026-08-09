import {
  computeBoostsForLap,
  isCountSynergyBuff,
  matchingDirectItemCount,
  type StackingState,
} from "./buffs";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type BuffApplication,
  type Build,
  type ContributionEffectKind,
  type ContributionEvidence,
  type FiredItem,
  type OfferedItem,
} from "./types";

export interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
  contributions: ContributionEvidence[];
}

interface LocatedItem {
  item: OfferedItem;
  area: "board" | "storage";
  index: number;
  active: boolean;
}

export function firesOnLap(cooldown: number, lap: number): boolean {
  return (lap - 1) % cooldown === 0;
}

export function simulatePlayerLaps(build: Build, lapCount = LAP_COUNT): PlayerLap[] {
  const locatedItems: LocatedItem[] = [
    ...build.slots.flatMap((slot, index) => slot.item
      ? [{ item: slot.item, area: "board" as const, index, active: true }]
      : []),
    ...build.storage.flatMap((position, index) => position.item
      ? [{
        item: position.item,
        area: "storage" as const,
        index,
        active: position.item.activeWhileStored === true,
      }]
      : []),
  ];
  const activeLocatedItems = locatedItems.filter(({ active }) => active);
  const activeItems = activeLocatedItems.map(({ item }) => item);
  const allHeldItems = locatedItems.map(({ item }) => item);
  let stackingState: StackingState = {};

  return Array.from({ length: lapCount }, (_, index) => {
    const lap = index + 1;
    const lapBoosts = computeBoostsForLap(activeItems, allHeldItems, lap, stackingState);
    stackingState = lapBoosts.stackingState;
    const firedItems: FiredItem[] = [];
    const contributions: ContributionEvidence[] = [];
    let time = build.car.baseLapTime;

    locatedItems.forEach((located) => {
      const { item } = located;
      const activeItemIndex = activeLocatedItems.indexOf(located);
      const effectKind = effectKindFor(item);
      let triggerState: ContributionEvidence["triggerState"] = "zero";
      let resultingContribution = 0;
      let reason: string | null = null;
      let buffApplications: BuffApplication[] = [];

      if (!located.active) {
        triggerState = "inactive-storage";
        reason = "Stored item is inactive in this build.";
      } else if (item.buff) {
        const matchingTargets = activeItems.filter(
          (candidate) => !candidate.buff && candidate.identityTag === item.identityTag,
        );
        const appliedPercent = buffPercentFor(
          item,
          activeItemIndex,
          allHeldItems,
          lapBoosts.stackingState,
        );
        const applicationType = effectKind === "flat-buff"
          ? "flat"
          : effectKind === "stacking-buff" ? "stacking" : "count";
        buffApplications = matchingTargets.map((target) => ({
          sourceItemId: item.id,
          targetItemId: target.id,
          type: applicationType,
          appliedPercent,
          appliedSeconds: target.timeModifier * appliedPercent / 100,
        }));
        const fires = effectKind === "count-buff"
          || item.cooldown === undefined
          || firesOnLap(item.cooldown, lap);
        triggerState = matchingTargets.length === 0
          ? "unmet"
          : fires ? "fired" : "cooldown";
        reason = matchingTargets.length === 0
          ? "No active matching direct item."
          : fires ? null : `Cooldown ${item.cooldown} does not fire on lap ${lap}.`;
        if (fires) firedItems.push({ id: item.id, contribution: appliedPercent });
      } else if (item.cooldown === undefined) {
        triggerState = "unmet";
        reason = "Direct item has no firing trigger.";
      } else if (!firesOnLap(item.cooldown, lap)) {
        triggerState = "cooldown";
        reason = `Cooldown ${item.cooldown} does not fire on lap ${lap}.`;
      } else {
        const boostPercent = item.identityTag
          ? (lapBoosts.boostsByTag[item.identityTag] ?? 0)
          : 0;
        resultingContribution = item.timeModifier * (1 + boostPercent / 100);
        time += resultingContribution;
        triggerState = resultingContribution === 0 ? "zero" : "fired";
        reason = resultingContribution === 0 ? "Effect fired with zero contribution." : null;
        buffApplications = activeItems
          .filter((candidate) => candidate.buff && candidate.identityTag === item.identityTag)
          .map((source) => {
            const sourceKind = effectKindFor(source);
            const appliedPercent = buffPercentFor(
              source,
              activeItems.indexOf(source),
              allHeldItems,
              lapBoosts.stackingState,
            );
            return {
              sourceItemId: source.id,
              targetItemId: item.id,
              type: sourceKind === "flat-buff"
                ? "flat" as const
                : sourceKind === "stacking-buff" ? "stacking" as const : "count" as const,
              appliedPercent,
              appliedSeconds: item.timeModifier * appliedPercent / 100,
            };
          });
        firedItems.push({ id: item.id, contribution: resultingContribution });
      }

      contributions.push({
        lap,
        sourceItemId: item.id,
        sourceLocation: { area: located.area, index: located.index },
        effectKind,
        triggerState,
        baseContribution: item.buff?.boostPercent ?? item.timeModifier,
        buffApplications,
        resultingContribution,
        preClampLapTime: 0,
        clampAdjustment: 0,
        resultingLapTime: 0,
        storageActive: located.area === "storage" && located.active,
        reason,
      });
    });

    const preClampLapTime = time;
    const resultingLapTime = Math.max(MIN_LAP_TIME, preClampLapTime);
    const clampAdjustment = resultingLapTime - preClampLapTime;
    contributions.forEach((evidence) => {
      evidence.preClampLapTime = preClampLapTime;
      evidence.clampAdjustment = clampAdjustment;
      evidence.resultingLapTime = resultingLapTime;
    });

    return { time: resultingLapTime, firedItems, contributions };
  });
}

function effectKindFor(item: OfferedItem): ContributionEffectKind {
  if (!item.buff) return item.timeModifier === 0 ? "neutral" : "direct";
  if (isCountSynergyBuff(item)) return "count-buff";
  return item.cooldown === undefined ? "flat-buff" : "stacking-buff";
}

function buffPercentFor(
  item: OfferedItem,
  activeItemIndex: number,
  allHeldItems: OfferedItem[],
  stackingState: StackingState,
): number {
  if (!item.buff) return 0;
  if (isCountSynergyBuff(item)) {
    return item.buff.boostPercent * matchingDirectItemCount(allHeldItems, item);
  }
  return item.cooldown === undefined
    ? item.buff.boostPercent
    : (stackingState[activeItemIndex] ?? 0);
}