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
import {
  matchesPhysicsCondition,
  simulateLapPhysics,
  STOCK_PHYSICAL_STATS,
  type PhysicalStats,
  type Track,
} from "./tracks";
import {
  LAP_COUNT,
  MIN_LAP_TIME,
  type AmplifierAttribution,
  type BuffApplication,
  type Build,
  type ConditionalPhysicsContribution,
  type ContributionEffectKind,
  type ContributionEvidence,
  type EnrichedLap,
  type FiredItem,
  type InstallationResolution,
  type ItemPhysicsContribution,
  type ItemPhysicalContributionEvidence,
  type LapPhysicsEvidence,
  type LiveStatChange,
  type OfferedItem,
  type PhysicsCondition,
  type RacePhase,
  type StatTarget,
  type SynergyResolution,
} from "./types";

export interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
  contributions: ContributionEvidence[];
  /** 021-arcade-physics-simulation: present only when simulatePlayerLaps was called with a track. */
  physics?: LapPhysicsEvidence;
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
  tier: 1 | 2 | 3;
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
export function resolvePhysicalStats(
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

/** One flat physical-stat contribution, attributable to the held item that authored it (025-vehicle-stat-display). */
export interface UnconditionalStatContribution {
  sourceItemId: string;
  stat: PhysicalStatTarget;
  value: number;
}

/**
 * A held item's physical-stat effect that cannot be resolved into the
 * unconditional current total because it depends on a track segment (022-
 * contextual-physics-effects) or on lap-to-lap stacking (023-stat-targeted-
 * amplifiers) — both require a lap/track context this build-only resolution
 * doesn't have (025-vehicle-stat-display spec.md Acceptance Scenario US1.4).
 */
export type ConditionalStatPotential =
  | { kind: "track-segment"; sourceItemId: string; stat: PhysicalStatTarget; condition: PhysicsCondition; value: number }
  | { kind: "lap-stacking"; sourceItemId: string; stat: PhysicalStatTarget; cooldown: number | undefined; boostPercent: number };

export interface CurrentBuildPhysicalStatsResult {
  stats: PhysicalStats;
  contributions: readonly UnconditionalStatContribution[];
  conditionalPotential: readonly ConditionalStatPotential[];
}

/**
 * The build's current physical stats without any track/lap context: stock
 * plus every active held item's own flat physics delta, amplified only by
 * Buffs/Synergies whose magnitude is fully determined by the build alone
 * (flat, count-synergy, and value-scaled — never a cooldown-stacking Buff,
 * whose magnitude only exists lap over lap). ConditionalPhysics entries and
 * stacking Buffs targeting a physical stat are surfaced as
 * `conditionalPotential` instead of folded into `stats`, so preparation
 * never claims an unresolved track- or lap-dependent bonus is active (025
 * research.md Decision 2, contract §3).
 */
export function resolveCurrentBuildPhysicalStats(build: Build): CurrentBuildPhysicalStatsResult {
  const synergyResolution = resolveSynergyEffects(build);
  const locatedItems = buildLocatedItems(build, synergyResolution);
  const activeLocatedItems = locatedItems.filter(({ active }) => active);
  const activeItems = activeLocatedItems.map(({ item }) => item);
  const allHeldItems = locatedItems.map(({ item }) => item);
  const fittedValue = sumFittedValue(locatedItems.filter(({ area }) => area === "board").map(({ item }) => item));

  const boostsByStat: Partial<Record<PhysicalStatTarget, number>> = {};
  const conditionalPotential: ConditionalStatPotential[] = [];

  activeItems.forEach((item, index) => {
    if (!item.buff) return;
    const targetStat = item.buff.targetStat;
    if (!targetStat || targetStat === "time") return;
    if (item.cooldown !== undefined && !isCountSynergyBuff(item)) {
      conditionalPotential.push({
        kind: "lap-stacking",
        sourceItemId: item.id,
        stat: targetStat,
        cooldown: item.cooldown,
        boostPercent: item.buff.boostPercent,
      });
      return;
    }
    const hasEligibleCandidate = activeItems.some(
      (candidate, candidateIndex) => candidateIndex !== index && hasDeltaForStat(candidate, targetStat),
    );
    if (!hasEligibleCandidate) return;
    const magnitude = isValueScaledBuff(item)
      ? item.buff.boostPercent * fittedValue
      : isCountSynergyBuff(item)
        ? item.buff.boostPercent * matchingStatItemCount(allHeldItems, item, targetStat)
        : item.buff.boostPercent;
    boostsByStat[targetStat] = (boostsByStat[targetStat] ?? 0) + magnitude;
  });

  const contributions: UnconditionalStatContribution[] = [];
  activeItems.forEach((item) => {
    if (!item.physics) return;
    const scaled = scaleAllStats(item.physics, boostsByStat);
    (Object.keys(DELTA_KEY_FOR_STAT) as PhysicalStatTarget[]).forEach((stat) => {
      const value = scaled[DELTA_KEY_FOR_STAT[stat]];
      if (value) contributions.push({ sourceItemId: item.id, stat, value });
    });
  });

  activeItems.forEach((item) => {
    (item.conditionalPhysics ?? []).forEach((entry) => {
      (Object.keys(DELTA_KEY_FOR_STAT) as PhysicalStatTarget[]).forEach((stat) => {
        const value = entry.delta[DELTA_KEY_FOR_STAT[stat]];
        if (value) conditionalPotential.push({ kind: "track-segment", sourceItemId: item.id, stat, condition: entry.condition, value });
      });
    });
  });

  return { stats: resolvePhysicalStats(activeItems, boostsByStat), contributions, conditionalPotential };
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

/**
 * Locates and resolves every held item's own effective form (tier, Fitted/
 * Improvised installation, synergy) once per build — composition doesn't
 * vary lap to lap (014-item-synergy-tags research.md Decision 3). Shared by
 * `simulatePlayerLaps` and `resolveCurrentBuildPhysicalStats` (025-vehicle-
 * stat-display) so both read one located-item truth rather than two.
 */
function buildLocatedItems(
  build: Build,
  synergyResolution: ReturnType<typeof resolveSynergyEffects>,
): LocatedItem[] {
  return [
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
        tier: slot.tier,
      }];
    }),
    ...build.storage.flatMap((position, index) => position.item
      ? [{
        item: applyTierBonus(position.item, position.tier),
        area: "storage" as const,
        index,
        active: position.item.activeWhileStored === true,
        tier: position.tier,
      }]
      : []),
  ];
}

export function simulatePlayerLaps(
  build: Build,
  lapCount = LAP_COUNT,
  track?: Track,
  /**
   * 028-pre-race-setup contract §4: a locked setup's `totalDelta`, applied
   * after every existing item/tier/installation/synergy/buff stat
   * resolution and before the positive-stat clamp/segment physics — never
   * itself amplified by tiers, buffs, or synergies (spec.md FR-004C,
   * research.md Decision 3). All-zero (the default) reproduces pre-028
   * Balanced/no-setup output byte-for-byte.
   */
  setupDeltas: ItemPhysicsContribution = {},
): PlayerLap[] {
  const synergyResolution = resolveSynergyEffects(build);
  const locatedItems: LocatedItem[] = buildLocatedItems(build, synergyResolution);
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
      const baseStats = resolvePhysicalStats(activeItems, lapBoosts.boostsByStat);
      physicsStats = {
        acceleration: Math.max(MIN_PHYSICAL_STAT, baseStats.acceleration + (setupDeltas.accelerationDelta ?? 0)),
        topSpeed: Math.max(MIN_PHYSICAL_STAT, baseStats.topSpeed + (setupDeltas.topSpeedDelta ?? 0)),
        brakingPower: Math.max(MIN_PHYSICAL_STAT, baseStats.brakingPower + (setupDeltas.brakingPowerDelta ?? 0)),
        corneringSpeed: Math.max(MIN_PHYSICAL_STAT, baseStats.corneringSpeed + (setupDeltas.corneringSpeedDelta ?? 0)),
      };
      const conditionalPhysicsContributions =
        resolveConditionalPhysicsContributions(activeItems, lapBoosts.boostsByStat);
      physicsResult = simulateLapPhysics(physicsStats, track.segments, conditionalPhysicsContributions);
    }

    const finalTime = physicsResult ? resultingLapTime + physicsResult.totalSeconds : resultingLapTime;
    const itemContributions: ItemPhysicalContributionEvidence[] = physicsResult
      ? locatedItems.map((located) => {
        const boostedFlat = located.active && located.item.physics
          ? scaleAllStats(located.item.physics, lapBoosts.boostsByStat)
          : {};
        const conditionals = located.active
          ? (located.item.conditionalPhysics ?? []).map((entry) => {
            const delta = scaleAllStats(entry.delta, lapBoosts.boostsByStat);
            const affectedStats = new Set(Object.keys(entry.delta));
            const matchedSegmentIndexes = [...new Set(physicsResult!.phases.flatMap((phase) => {
              const segment = track!.segments[phase.segmentIndex];
              const conditionMatches = segment?.kind === "corner"
                && matchesPhysicsCondition(entry.condition, segment.turnDegrees);
              const contributionMatches = (phase.conditionalMatches ?? []).some((match) =>
                match.sourceItemId === located.item.id && affectedStats.has(match.stat));
              return conditionMatches && contributionMatches ? [phase.segmentIndex] : [];
            }))];
            return { condition: entry.condition, delta, matchedSegmentIndexes };
          })
          : [];
        const incomingBuffs = contributions.flatMap((entry) => entry.buffApplications)
          .filter((application) => application.targetItemId === located.item.id);
        return {
          lap,
          sourceItemId: located.item.id,
          sourceLocation: { area: located.area, index: located.index },
          slotId: located.slotId,
          tier: located.tier,
          installationState: located.installation?.state,
          active: located.active,
          flatResolvedDelta: boostedFlat,
          conditionalResolvedDeltas: conditionals,
          buffApplications: incomingBuffs,
          synergyApplications: located.synergy?.applications ?? [],
          inactiveReason: located.active ? undefined : "Stored item is inactive in this build.",
        };
      })
      : [];
    const physics = physicsResult && physicsStats
      ? { stats: physicsStats, phases: physicsResult.phases, itemContributions }
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

// --- Feature 032 T020: live-stat change evidence --------------------------

const LIVE_STAT_ORDER: readonly PhysicalStatTarget[] = [
  "acceleration", "topSpeed", "brakingPower", "corneringSpeed",
];

const LIVE_STAT_EPSILON = 1e-9;

/** The effective stacking percent one stacking-buff source applies on a lap. */
function stackingPercentOnLap(lap: PlayerLap, sourceItemId: string): number {
  const evidence = lap.contributions.find(
    (entry) => entry.sourceItemId === sourceItemId && entry.effectKind === "stacking-buff",
  );
  if (!evidence || evidence.buffApplications.length === 0) return 0;
  return evidence.buffApplications[0].appliedPercent;
}

/**
 * Derives immutable live-stat change evidence from retained lap physics
 * (032 FR-001/FR-002, data-model.md "LiveStatChange", contract §1). Pure
 * projection over already-recorded evidence — never reruns buffs, synergy,
 * track physics, or contest ordering:
 *
 * - Lap 1: one change per contributing item per stat, attributed from the
 *   lap's resolved flat deltas, with amplifier attribution from the lap's
 *   buff applications. Cumulative previous/current reconcile exactly to the
 *   lap's effective stats minus `baselineStats` (stock + setup, caller-owned).
 * - Later laps: one change per stacking-buff source whose applied percent
 *   grew at that lap boundary; per-source deltas split proportionally to the
 *   percent increments so every boundary still reconciles exactly.
 * - Zero deltas produce no change; laps without physics evidence are skipped.
 */
export function deriveLiveStatChanges(
  laps: readonly PlayerLap[],
  baselineStats: PhysicalStats,
  itemsById: ReadonlyMap<string, OfferedItem>,
): readonly LiveStatChange[] {
  const nameOf = (itemId: string) => itemsById.get(itemId)?.name ?? itemId;
  const changes: LiveStatChange[] = [];
  const running: Record<PhysicalStatTarget, number> = {
    acceleration: baselineStats.acceleration,
    topSpeed: baselineStats.topSpeed,
    brakingPower: baselineStats.brakingPower,
    corneringSpeed: baselineStats.corneringSpeed,
  };
  let previousStats: PhysicalStats | null = null;

  laps.forEach((lap, lapIndex) => {
    const lapNumber = lapIndex + 1;
    const physics = lap.physics;
    if (!physics) return;

    LIVE_STAT_ORDER.forEach((stat) => {
      const deltaKey = DELTA_KEY_FOR_STAT[stat];
      const current = physics.stats[stat];
      const totalDelta = current - running[stat];
      if (Math.abs(totalDelta) < LIVE_STAT_EPSILON) return;

      let boundarySeq = 0;
      const emit = (sourceItemId: string, delta: number, amplifierSources: readonly AmplifierAttribution[]) => {
        const previousValue = running[stat];
        running[stat] += delta;
        boundarySeq += 1;
        changes.push({
          boundaryId: `stat-lap${lapNumber}-${stat}-${boundarySeq}`,
          lap: lapNumber,
          stat,
          previousValue,
          currentValue: previousValue + delta,
          delta,
          direction: delta >= 0 ? "up" : "down",
          sourceItemId,
          sourceItemName: nameOf(sourceItemId),
          amplifierSources,
        });
      };

      if (previousStats === null) {
        // Race-start boundary: attribute each resolved flat delta to its own
        // item in canonical evidence order; amplifier applications arriving
        // at this item explain the applied magnitude (FR-003).
        (physics.itemContributions ?? []).forEach((evidence) => {
          const resolved = evidence.flatResolvedDelta?.[deltaKey];
          if (!resolved) return;
          const amplifiers: AmplifierAttribution[] = evidence.buffApplications
            .filter((application) => application.targetStat === stat)
            .map((application) => ({
              sourceItemId: application.sourceItemId,
              sourceItemName: nameOf(application.sourceItemId),
              magnitudePercent: application.appliedPercent,
              affectedContributionLabel: `${nameOf(evidence.sourceItemId)} ${stat} effect`,
            }));
          emit(evidence.sourceItemId, resolved, amplifiers);
        });
      } else {
        // Mid-race boundary: the only lap-varying stat input is stacking
        // percent growth. Split the observed delta proportionally to each
        // source's percent increment so the boundary still reconciles.
        const increments = lap.contributions
          .filter((entry) => entry.effectKind === "stacking-buff"
            && entry.buffApplications.some((application) => application.targetStat === stat))
          .map((entry) => {
            const previousPercent = lapIndex > 0
              ? stackingPercentOnLap(laps[lapIndex - 1], entry.sourceItemId)
              : 0;
            const currentPercent = stackingPercentOnLap(lap, entry.sourceItemId);
            return { sourceItemId: entry.sourceItemId, increment: currentPercent - previousPercent };
          })
          .filter((entry) => Math.abs(entry.increment) >= LIVE_STAT_EPSILON);
        const totalIncrement = increments.reduce((sum, entry) => sum + entry.increment, 0);
        if (Math.abs(totalIncrement) < LIVE_STAT_EPSILON) return;
        increments.forEach((entry) => {
          emit(entry.sourceItemId, totalDelta * (entry.increment / totalIncrement), []);
        });
      }
    });

    previousStats = physics.stats;
  });

  return changes;
}

/** Derive once across the complete race, then group evidence by its retained lap. */
export function deriveLiveStatChangesByLap(
  laps: readonly PlayerLap[],
  baselineStats: PhysicalStats,
  itemsById: ReadonlyMap<string, OfferedItem>,
): readonly (readonly LiveStatChange[])[] {
  const changes = deriveLiveStatChanges(laps, baselineStats, itemsById);
  return laps.map((_, index) => changes.filter((change) => change.lap === index + 1));
}

// --- Feature 033 US1 (T025): bounded temporary-effect lap enrichment --------

/**
 * A retained temporary effect over an explicit lap window (FR-010). It adjusts
 * target pace (a fraction of the lap time) or a physical-stat window (bounded
 * seconds), never any authored build value. Numeric bounds/caps are applied by
 * the caller from configured `signatureTemporaryEffectCaps`.
 */
export interface TemporaryLapEffect {
  kind: "target-pace" | "stat-window";
  stat?: StatTarget;
  /** From the configured cap: target-pace fraction (0..1) or stat-window seconds. */
  magnitude: number;
  startLap: number;
  endLap: number;
}

/**
 * Enrich authored lap times with the bounded temporary effects active on each
 * lap. Pure and deterministic — identical inputs yield identical enriched laps.
 * `baseTime` always retains the authored (pre-enrichment) lap; `enrichedTime`
 * additionally folds any active window effect and the optional incident time
 * loss, clamped to the same positive floor as normal resolution.
 */
export function enrichLapsWithTemporaryEffects(
  laps: readonly { time: number }[],
  phaseForLap: (lap: number) => RacePhase,
  effects: readonly TemporaryLapEffect[] = [],
  incidentTimeLossByLap: ReadonlyMap<number, number> = new Map(),
): EnrichedLap[] {
  return laps.map((lap, index) => {
    const lapNumber = index + 1;
    const baseTime = lap.time;
    const phase = phaseForLap(lapNumber);
    let adjustment = 0;
    for (const effect of effects) {
      if (lapNumber < effect.startLap || lapNumber > effect.endLap) continue;
      const magnitude = Number.isFinite(effect.magnitude) ? effect.magnitude : 0;
      adjustment += effect.kind === "target-pace"
        // Faster target pace shortens the lap by a bounded fraction.
        ? -(baseTime * Math.min(Math.max(magnitude, 0), 1))
        // A stat window shortens the lap by the retained bounded seconds.
        : -magnitude;
    }
    const incidentTimeLoss = incidentTimeLossByLap.get(lapNumber) ?? 0;
    const enrichedTime = Math.max(MIN_LAP_TIME, baseTime + adjustment + incidentTimeLoss);
    return { lap: lapNumber, phase, baseTime, enrichedTime, incidentTimeLoss };
  });
}
