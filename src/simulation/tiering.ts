import type { ItemDefinition, VehicleBuild } from "./types";

export type DuplicateResolution =
  | { kind: "new" }
  | {
    kind: "tier-upgrade";
    area: "vehicle" | "storage";
    slotId?: string;
    index?: number;
    fromTier: 1 | 2;
    toTier: 2 | 3;
  }
  | { kind: "max-tier-convert"; creditsGained: number };

/**
 * Balance-pass placeholder (016-duplicate-item-tiering spec.md
 * Assumptions): not fixed by the spec. Applied per tier above tier 1, so a
 * tier-3 item is boosted by TIER_BONUS_PERCENT * 2.
 */
export const TIER_BONUS_PERCENT = 15;

/**
 * Classifies an about-to-be-acquired item against the current build
 * (016-duplicate-item-tiering contract §2). Pure and deterministic —
 * scans both board and storage for a matching `ItemDefinition.id`.
 */
export function resolveDuplicateAcquisition(build: VehicleBuild, item: ItemDefinition): DuplicateResolution {
  const slotMatch = build.slots.find((slot) => slot.item?.id === item.id);
  if (slotMatch) return tierResolution("vehicle", item, slotMatch.tier, { slotId: slotMatch.slotId });

  const storageMatch = build.storage.find((position) => position.item?.id === item.id);
  if (storageMatch) return tierResolution("storage", item, storageMatch.tier, { index: storageMatch.index });

  return { kind: "new" };
}

function tierResolution(
  area: "vehicle" | "storage",
  item: ItemDefinition,
  tier: 1 | 2 | 3,
  position: { slotId: string } | { index: number },
): DuplicateResolution {
  if (tier === 3) return { kind: "max-tier-convert", creditsGained: Math.floor(item.price / 2) };
  return { kind: "tier-upgrade", area, ...position, fromTier: tier, toTier: (tier + 1) as 2 | 3 };
}

/**
 * Boosts an item's own authored effect by TIER_BONUS_PERCENT per tier above
 * tier 1 (016-duplicate-item-tiering contract §3). Never mutates the input
 * item or the shared catalog entry.
 */
export function applyTierBonus(item: ItemDefinition, tier: 1 | 2 | 3): ItemDefinition {
  if (tier === 1) return item;
  const percent = TIER_BONUS_PERCENT * (tier - 1);
  if (item.buff) {
    return { ...item, buff: { ...item.buff, boostPercent: item.buff.boostPercent + percent } };
  }
  return { ...item, timeModifier: item.timeModifier + item.timeModifier * (percent / 100) };
}
