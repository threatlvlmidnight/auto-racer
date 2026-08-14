import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";
import type { ItemDefinition } from "../../src/simulation/types";

const catalog = [NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS)].flat();
const PHYSICAL_STATS = ["acceleration", "topSpeed", "brakingPower", "corneringSpeed"] as const;

function requireItem(predicate: (item: ItemDefinition) => boolean): ItemDefinition {
  const item = catalog.find(predicate);
  if (!item) throw new Error("Feature 025 fixture shape is missing from the catalog");
  return item;
}

/**
 * Catalog-backed representatives for every unconditional/conditional shape
 * `resolveCurrentBuildPhysicalStats` (src/simulation/laps.ts) and the
 * vehicle-stat presentation layer must reconcile (025-vehicle-stat-display
 * tasks.md T003). Fixtures never invent mechanics the game does not author.
 */
export const VEHICLE_STAT_FIXTURES = {
  /** A single-stat flat physics delta with no tradeoff, condition, or amplifier. */
  direct: requireItem((item) => Boolean(item.physics) && !item.conditionalPhysics?.length
    && Object.values(item.physics ?? {}).filter((value): value is number => typeof value === "number").length === 1),
  /** One item improving one physical stat while harming another. */
  tradeoff: requireItem((item) => {
    const values = Object.values(item.physics ?? {}).filter((value): value is number => typeof value === "number");
    return values.some((value) => value > 0) && values.some((value) => value < 0);
  }),
  /** Requires track-segment context (022-contextual-physics-effects) — always conditional potential, never a current total. Pure (no flat physics) so its current-total exclusion is unambiguous. */
  conditional: requireItem((item) => Boolean(item.conditionalPhysics?.length) && !item.physics),
  /** Always-on Buff targeting a physical stat (no cooldown) — fully resolvable without a lap. */
  flatBuff: requireItem((item) => Boolean(item.buff) && item.cooldown === undefined && !item.buff?.perCount
    && !item.buff?.scalesWithFittedValue && PHYSICAL_STATS.includes(item.buff!.targetStat as (typeof PHYSICAL_STATS)[number])),
  /** Count-synergy Buff targeting a physical stat — deterministic from build composition alone. */
  countBuff: requireItem((item) => item.buff?.perCount === true
    && PHYSICAL_STATS.includes(item.buff!.targetStat as (typeof PHYSICAL_STATS)[number])),
  /** Buff whose magnitude scales with summed fitted item value (020-character-item-pools) — deterministic from the build. */
  valueScaledBuff: requireItem((item) => item.buff?.scalesWithFittedValue === true
    && PHYSICAL_STATS.includes(item.buff!.targetStat as (typeof PHYSICAL_STATS)[number])),
  /** Cooldown Buff targeting a physical stat — its magnitude only exists lap over lap, so it is lap-stacking conditional potential. */
  stackingBuff: requireItem((item) => Boolean(item.buff) && item.cooldown !== undefined && !item.buff?.perCount
    && PHYSICAL_STATS.includes(item.buff!.targetStat as (typeof PHYSICAL_STATS)[number])),
  /** Item-to-item synergy (014-item-synergy-tags) affecting a physical stat via percent amplification of another item's own delta. */
  synergy: requireItem((item) => item.synergyEffects?.some((effect) =>
    PHYSICAL_STATS.includes(effect.targetStat as (typeof PHYSICAL_STATS)[number])) === true),
  /** Contributes only while stored (activeWhileStored). */
  storageActive: requireItem((item) => item.activeWhileStored === true && Boolean(item.physics)),
  /** Inert while stored — must not contribute unless installed. */
  storageInert: requireItem((item) => !item.activeWhileStored && Boolean(item.physics)),
} as const;
