import {
  computeBoostsForLap,
  isCountSynergyBuff,
  matchingDirectItemCount,
  type StackingState,
} from "./buffs";
import { resolveInstallation } from "./slots";
import { resolveSynergyEffects } from "./synergy";
import { applyTierBonus } from "./tiering";
import { simulateLapPhysics, STOCK_PHYSICAL_STATS, type PhysicalStats, type Track } from "./tracks";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type BuffApplication,
  type Build,
  type ContributionEffectKind,
  type ContributionEvidence,
  type FiredItem,
  type InstallationResolution,
  type LapPhaseBreakdown,
  type OfferedItem,
  type SynergyResolution,
} from "./types";

export interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
  contributions: ContributionEvidence[];
  /** 021-arcade-physics-simulation: present only when simulatePlayerLaps was called with a track. */
  physics?: { stats: PhysicalStats; phases: LapPhaseBreakdown[] };
}

interface LocatedItem {
  /** Base item with time-modifier/buff-boost already folded in for a vehicle slot. */
  item: OfferedItem;
  area: "board" | "storage";
  index: number;
  active: boolean;
  slotId?: string;
  installation?: InstallationResolution;
  /** Feature 014: synergy effects contributing to this slot's item, for attribution. */
  synergy?: SynergyResolution;
}

export function firesOnLap(cooldown: number, lap: number): boolean {
  return (lap - 1) % cooldown === 0;
}

/**
 * Adds a percent delta to an item's own numeric effect: percentage points
 * directly onto a buff's boostPercent (matching Fitted/Improvised's
 * buffBoostPercent convention), or a proportional scale of a direct item's
 * own timeModifier (014-item-synergy-tags contract §3).
 */
function foldPercentDelta(item: OfferedItem, percent: number): OfferedItem {
  if (percent === 0) return item;
  if (item.buff) {
    return { ...item, buff: { ...item.buff, boostPercent: item.buff.boostPercent + percent } };
  }
  return { ...item, timeModifier: item.timeModifier + item.timeModifier * (percent / 100) };
}

/**
 * Folds an item's authored Fitted/Improvised behavior, then any resolved
 * synergy delta, into its own numeric fields so every downstream
 * calculation (buffs, direct effects) reads one effective item without
 * duplicating the truth table (010 US3, contract §4; 014 contract §3).
 * Storage items and Flex placements have no Fitted/Improvised behavior to
 * fold in, but may still carry a synergy delta.
 */
function effectiveItem(
  item: OfferedItem,
  installation: InstallationResolution,
  synergy?: SynergyResolution,
): OfferedItem {
  const behavior = installation.appliedInstallationBehavior;
  let result = item;
  if (behavior) {
    if (behavior.kind === "time-modifier") {
      result = { ...result, timeModifier: result.timeModifier + (behavior.timeModifier ?? 0) };
    } else if (behavior.kind === "buff-boost" && result.buff) {
      result = { ...result, buff: { ...result.buff, boostPercent: result.buff.boostPercent + (behavior.buffBoostPercent ?? 0) } };
    }
  }
  if (synergy) {
    result = foldPercentDelta(result, synergy.appliedDeltaPercent);
  }
  return result;
}

function installationBehaviorSource(installation: InstallationResolution): string {
  return installation.appliedInstallationBehavior?.description ?? installation.baseBehavior.description;
}

/** Every resolved stat stays strictly positive, even under large negative item deltas (021 data-model.md Validation Invariant 3). */
const MIN_PHYSICAL_STAT = 1;

/**
 * A build's resolved PhysicalStats: the stock baseline plus every active
 * held item's own ItemPhysicsContribution, summed directly — never a ratio
 * or count of items (021 research.md Decision 6, contract §1). Storage
 * items excluded unless active, matching every other per-lap fold's
 * existing active-item filtering convention.
 */
function resolvePhysicalStats(activeItems: readonly OfferedItem[]): PhysicalStats {
  const totals = activeItems.reduce(
    (sum, item) => ({
      acceleration: sum.acceleration + (item.physics?.accelerationDelta ?? 0),
      topSpeed: sum.topSpeed + (item.physics?.topSpeedDelta ?? 0),
      brakingPower: sum.brakingPower + (item.physics?.brakingPowerDelta ?? 0),
      corneringSpeed: sum.corneringSpeed + (item.physics?.corneringSpeedDelta ?? 0),
    }),
    { acceleration: 0, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 },
  );

  return {
    acceleration: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.acceleration + totals.acceleration),
    topSpeed: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.topSpeed + totals.topSpeed),
    brakingPower: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.brakingPower + totals.brakingPower),
    corneringSpeed: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.corneringSpeed + totals.corneringSpeed),
  };
}

export function simulatePlayerLaps(build: Build, lapCount = LAP_COUNT, track?: Track): PlayerLap[] {
  // Computed once per build, before the per-lap loop — composition doesn't
  // vary lap to lap (014-item-synergy-tags research.md Decision 3).
  const synergyResolution = resolveSynergyEffects(build);
  const locatedItems: LocatedItem[] = [
    ...build.slots.flatMap((slot, index) => {
      if (!slot.item) return [];
      const installation = resolveInstallation(slot.item, slot.slotType);
      const synergy = synergyResolution.get(slot.slotId);
      return [{
        item: effectiveItem(applyTierBonus(slot.item, slot.tier), installation, synergy),
        area: "board" as const,
        index,
        active: true,
        slotId: slot.slotId,
        installation,
        synergy: synergy && synergy.applications.length > 0 ? synergy : undefined,
      }];
    }),
    ...build.storage.flatMap((position, index) => position.item
      ? [{
        item: applyTierBonus(position.item, position.tier),
        area: "storage" as const,
        index,
        active: position.item.activeWhileStored === true,
      }]
      : []),
  ];
  const activeLocatedItems = locatedItems.filter(({ active }) => active);
  const activeItems = activeLocatedItems.map(({ item }) => item);
  const allHeldItems = locatedItems.map(({ item }) => item);
  // 021-arcade-physics-simulation: a build's own physical stats don't vary
  // lap to lap either — resolved once (research.md Decision 6), from the
  // same active-item set every other per-lap fold already uses.
  const physicsStats = resolvePhysicalStats(activeItems);
  const physicsResult = track ? simulateLapPhysics(physicsStats, track.segments) : undefined;
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
        slotId: located.slotId,
        installation: located.installation
          ? { state: located.installation.state, behavior: installationBehaviorSource(located.installation) }
          : undefined,
        synergy: located.synergy?.applications,
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

    // 021-arcade-physics-simulation: the real physics simulation is a
    // whole-lap addition applied after every existing fold (tier,
    // installation, synergy, buffs, clamp) — a build/car-level effect, not
    // attributable to any single held item (research.md Decision 6).
    // Supersedes 018's buildTrackLean/trackFit ratio-based fold entirely.
    const finalTime = physicsResult ? resultingLapTime + physicsResult.totalSeconds : resultingLapTime;
    const physics = physicsResult
      ? { stats: physicsStats, phases: physicsResult.phases }
      : undefined;

    return { time: finalTime, firedItems, contributions, physics };
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