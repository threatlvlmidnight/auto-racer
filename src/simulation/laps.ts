import {
  computeBoostsForLap,
  DELTA_KEY_FOR_STAT,
  hasDeltaForStat,
  isCountSynergyBuff,
  isValueScaledBuff,
  matchingDirectItemCount,
  matchingStatItemCount,
  sumFittedValue,
  type PhysicalStatTarget,
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
  type ConditionalPhysicsContribution,
  type ContributionEffectKind,
  type ContributionEvidence,
  type FiredItem,
  type InstallationResolution,
  type ItemPhysicsContribution,
  type LapPhaseBreakdown,
  type OfferedItem,
  type StatTarget,
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
 * Scales every present delta field DELTA_KEY_FOR_STAT knows about — an
 * item's own flat physics field, and every conditionalPhysics entry's own
 * delta — by `percent`, using the same value + value*(percent/100) pattern
 * as the legacy timeModifier fold (023-stat-targeted-amplifiers contract
 * §3). Fields the item doesn't carry are left untouched.
 */
function scaleStatDelta(delta: ItemPhysicsContribution, stat: PhysicalStatTarget, percent: number): ItemPhysicsContribution {
  const deltaKey = DELTA_KEY_FOR_STAT[stat];
  const value = delta[deltaKey];
  if (value === undefined || percent === 0) return delta;
  return { ...delta, [deltaKey]: value + value * (percent / 100) };
}

function applyStatPercent(item: OfferedItem, stat: PhysicalStatTarget, percent: number): OfferedItem {
  if (percent === 0) return item;
  const physics = item.physics ? scaleStatDelta(item.physics, stat, percent) : item.physics;
  const conditionalPhysics = item.conditionalPhysics?.map((contribution) => ({
    ...contribution,
    delta: scaleStatDelta(contribution.delta, stat, percent),
  }));
  return { ...item, physics, conditionalPhysics: conditionalPhysics ?? item.conditionalPhysics };
}

/**
 * Adds a percent delta to an item's own numeric effect(s), one StatTarget key
 * at a time: "time" percentage points directly onto a buff's boostPercent
 * (matching Fitted/Improvised's buffBoostPercent convention) or a
 * proportional scale of a direct item's own timeModifier (014-item-synergy-
 * tags contract §3); any physical-stat key scales that item's own physics/
 * conditionalPhysics deltas the same multiplicative way
 * (023-stat-targeted-amplifiers contract §3).
 */
function foldPercentDelta(item: OfferedItem, percentByStat: Partial<Record<StatTarget, number>>): OfferedItem {
  let result = item;
  const timePercent = percentByStat.time ?? 0;
  if (timePercent !== 0) {
    result = result.buff
      ? { ...result, buff: { ...result.buff, boostPercent: result.buff.boostPercent + timePercent } }
      : { ...result, timeModifier: result.timeModifier + result.timeModifier * (timePercent / 100) };
  }
  (Object.keys(DELTA_KEY_FOR_STAT) as PhysicalStatTarget[]).forEach((stat) => {
    result = applyStatPercent(result, stat, percentByStat[stat] ?? 0);
  });
  return result;
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
 *
 * 023-stat-targeted-amplifiers: `boostsByStat` (a specific lap's
 * accumulated Buff percent per stat — usually empty) scales each item's own
 * flat delta before summing. Called fresh every lap (research.md Decision
 * 5) — with an all-zero `boostsByStat`, `value * (1 + 0/100)` is IEEE754-
 * exact, so this reduces to the pre-feature once-per-build computation
 * byte-for-byte (verified by US3's regression tests, not merely assumed).
 */
function resolvePhysicalStats(
  activeItems: readonly OfferedItem[],
  boostsByStat: Partial<Record<PhysicalStatTarget, number>>,
): PhysicalStats {
  const totals = activeItems.reduce(
    (sum, item) => {
      const scaled = item.physics ? scaleAllStats(item.physics, boostsByStat) : undefined;
      return {
        acceleration: sum.acceleration + (scaled?.accelerationDelta ?? 0),
        topSpeed: sum.topSpeed + (scaled?.topSpeedDelta ?? 0),
        brakingPower: sum.brakingPower + (scaled?.brakingPowerDelta ?? 0),
        corneringSpeed: sum.corneringSpeed + (scaled?.corneringSpeedDelta ?? 0),
      };
    },
    { acceleration: 0, topSpeed: 0, brakingPower: 0, corneringSpeed: 0 },
  );

  return {
    acceleration: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.acceleration + totals.acceleration),
    topSpeed: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.topSpeed + totals.topSpeed),
    brakingPower: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.brakingPower + totals.brakingPower),
    corneringSpeed: Math.max(MIN_PHYSICAL_STAT, STOCK_PHYSICAL_STATS.corneringSpeed + totals.corneringSpeed),
  };
}

/** Applies every stat's own boostsByStat percent to a single delta object, once per stat key. */
function scaleAllStats(
  delta: ItemPhysicsContribution,
  boostsByStat: Partial<Record<PhysicalStatTarget, number>>,
): ItemPhysicsContribution {
  return (Object.keys(DELTA_KEY_FOR_STAT) as PhysicalStatTarget[]).reduce(
    (result, stat) => scaleStatDelta(result, stat, boostsByStat[stat] ?? 0),
    delta,
  );
}

/**
 * 022-contextual-physics-effects: flattens every active held item's own
 * conditionalPhysics entries into one list (order-preserving, no
 * deduplication — additive stacking, data-model.md), mirroring
 * resolvePhysicalStats's own active-item filtering. Stamps each entry with
 * its owning item's real id (US3 inspectability, FR-006) — authored content
 * never sets sourceItemId itself.
 *
 * 023-stat-targeted-amplifiers: each contribution's own delta is scaled by
 * `boostsByStat` the same way resolvePhysicalStats scales flat deltas
 * (contract §3 — a stat-targeted amplifier reaches both).
 */
function resolveConditionalPhysicsContributions(
  activeItems: readonly OfferedItem[],
  boostsByStat: Partial<Record<PhysicalStatTarget, number>>,
): ConditionalPhysicsContribution[] {
  return activeItems.flatMap((item) =>
    (item.conditionalPhysics ?? []).map((contribution) => ({
      ...contribution,
      sourceItemId: item.id,
      delta: scaleAllStats(contribution.delta, boostsByStat),
    })));
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
  // 020-character-item-pools: "fitted" means vehicle slots specifically —
  // storage is excluded even when activeWhileStored, matching the term's
  // existing meaning throughout this codebase. Composition doesn't vary
  // lap to lap, so this is computed once, like synergyResolution above.
  const fittedValue = sumFittedValue(locatedItems.filter(({ area }) => area === "board").map(({ item }) => item));
  let stackingState: StackingState = {};

  return Array.from({ length: lapCount }, (_, index) => {
    const lap = index + 1;
    const lapBoosts = computeBoostsForLap(activeItems, allHeldItems, lap, stackingState, fittedValue);
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
        const targetStat = item.buff.targetStat ?? "time";
        const matchingTargets = targetStat === "time"
          ? activeItems.filter((candidate) => !candidate.buff && candidate.identityTag === item.identityTag)
          : activeItems.filter((candidate) => candidate !== item && hasDeltaForStat(candidate, targetStat));
        const appliedPercent = buffPercentFor(
          item,
          activeItemIndex,
          allHeldItems,
          lapBoosts.stackingState,
          fittedValue,
        );
        const applicationType = effectKind === "flat-buff"
          ? "flat"
          : effectKind === "stacking-buff" ? "stacking" : "count";
        buffApplications = matchingTargets.map((target) => ({
          sourceItemId: item.id,
          targetItemId: target.id,
          type: applicationType,
          appliedPercent,
          targetStat,
          appliedSeconds: targetStat === "time" ? target.timeModifier * appliedPercent / 100 : 0,
          appliedStatDelta: targetStat === "time"
            ? undefined
            : totalDeltaForStat(target, targetStat) * appliedPercent / 100,
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
          // 023-stat-targeted-amplifiers: this branch's resultingContribution
          // is computed purely from boostsByTag (never boostsByStat), so
          // only genuinely time-targeted buffs actually influenced it — a
          // stat-targeted buff that happens to also carry a matching
          // identityTag contributed nothing here and must not be listed.
          .filter((candidate) =>
            candidate.buff
            && (candidate.buff.targetStat ?? "time") === "time"
            && candidate.identityTag === item.identityTag)
          .map((source) => {
            const sourceKind = effectKindFor(source);
            const appliedPercent = buffPercentFor(
              source,
              activeItems.indexOf(source),
              allHeldItems,
              lapBoosts.stackingState,
              fittedValue,
            );
            return {
              sourceItemId: source.id,
              targetItemId: item.id,
              type: sourceKind === "flat-buff"
                ? "flat" as const
                : sourceKind === "stacking-buff" ? "stacking" as const : "count" as const,
              appliedPercent,
              targetStat: "time" as const,
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
    //
    // 023-stat-targeted-amplifiers: resolved fresh every lap using this
    // lap's own lapBoosts.boostsByStat (research.md Decision 5/7) — a build
    // with no lap-varying stat-targeted amplifier has an all-zero
    // boostsByStat on every lap, which reduces this to the pre-feature
    // once-per-build computation byte-for-byte (verified by US3).
    let physicsStats: PhysicalStats | undefined;
    let physicsResult: ReturnType<typeof simulateLapPhysics> | undefined;
    if (track) {
      physicsStats = resolvePhysicalStats(activeItems, lapBoosts.boostsByStat);
      const conditionalPhysicsContributions =
        resolveConditionalPhysicsContributions(activeItems, lapBoosts.boostsByStat);
      physicsResult = simulateLapPhysics(physicsStats, track.segments, conditionalPhysicsContributions);
    }

    const finalTime = physicsResult ? resultingLapTime + physicsResult.totalSeconds : resultingLapTime;
    const physics = physicsResult && physicsStats
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

/**
 * 023-stat-targeted-amplifiers: mirrors computeBoostsForLap's own per-item
 * magnitude computation exactly, so this evidence-layer value never drifts
 * from what the real simulation actually applied — count-synergy counting
 * switches from identityTag (matchingDirectItemCount) to stat-delta
 * eligibility (matchingStatItemCount) for a stat-targeted buff; stacking
 * still reads the same positionally-keyed stackingState either way.
 */
function buffPercentFor(
  item: OfferedItem,
  activeItemIndex: number,
  allHeldItems: OfferedItem[],
  stackingState: StackingState,
  fittedValue = 0,
): number {
  if (!item.buff) return 0;
  const targetStat = item.buff.targetStat ?? "time";
  if (isValueScaledBuff(item)) {
    return item.buff.boostPercent * fittedValue;
  }
  if (isCountSynergyBuff(item)) {
    return targetStat === "time"
      ? item.buff.boostPercent * matchingDirectItemCount(allHeldItems, item)
      : item.buff.boostPercent * matchingStatItemCount(allHeldItems, item, targetStat as PhysicalStatTarget);
  }
  return item.cooldown === undefined
    ? item.buff.boostPercent
    : (stackingState[activeItemIndex] ?? 0);
}

/** Sums a target's own flat physics delta plus every matching conditionalPhysics delta for one stat. */
function totalDeltaForStat(item: OfferedItem, stat: PhysicalStatTarget): number {
  const deltaKey = DELTA_KEY_FOR_STAT[stat];
  const flat = item.physics?.[deltaKey] ?? 0;
  const conditional = (item.conditionalPhysics ?? []).reduce(
    (sum, contribution) => sum + (contribution.delta[deltaKey] ?? 0),
    0,
  );
  return flat + conditional;
}