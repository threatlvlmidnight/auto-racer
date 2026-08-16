import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";

const catalog = [NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS)].flat();
const requireItem = (predicate: (item: (typeof catalog)[number]) => boolean) => {
  const item = catalog.find(predicate);
  if (!item) throw new Error("Feature 024 fixture shape is missing from the catalog");
  return item;
};

/** Catalog-backed representatives: fixtures never invent mechanics the game does not author. */
export const ITEM_PRESENTATION_FIXTURES = {
  direct: requireItem((item) => Boolean(item.physics) && !item.conditionalPhysics?.length),
  tradeoff: requireItem((item) => {
    const values = Object.values(item.physics ?? {}).filter((value): value is number => typeof value === "number");
    return values.some((value) => value > 0) && values.some((value) => value < 0);
  }),
  conditional: requireItem((item) => Boolean(item.conditionalPhysics?.length)),
  flatBuff: requireItem((item) => Boolean(item.buff) && item.cooldown === undefined && !item.buff?.perCount),
  stackingBuff: requireItem((item) => Boolean(item.buff) && item.cooldown !== undefined),
  countBuff: requireItem((item) => item.buff?.perCount === true),
  synergy: requireItem((item) => Boolean(item.synergyEffects?.length)),
  storageActive: requireItem((item) => item.activeWhileStored === true),
  storageInert: requireItem((item) => !item.activeWhileStored),
  economyOnly: catalog.find((item) => item.timeModifier === 0 && !item.physics && !item.conditionalPhysics?.length && !item.buff && !item.synergyEffects?.length) ?? null,
} as const;

/**
 * Feature 034 (T004): every playable item's authored placement behavior, from the
 * authored catalog (never invented). Records the Fitted/Improvised consequence
 * kind per item so T048/T049 corpus audits and presentation previews can reconcile
 * every item's exact placement contribution. Purely derived — a snapshot helper,
 * not a new authority.
 */
export interface PlacementBehaviorInventoryEntry {
  itemId: string;
  itemName: string;
  fittedBehaviorKind: "time-modifier" | "buff-boost" | "none";
  improvisedBehaviorKind: "time-modifier" | "buff-boost" | "none";
  fittedDescription: string;
  improvisedDescription: string;
}

/** Inventory of every playable item's exact placement behavior (T004). */
export function placementBehaviorInventory(): readonly PlacementBehaviorInventoryEntry[] {
  return catalog.map((item) => ({
    itemId: item.id,
    itemName: item.name,
    fittedBehaviorKind: item.fittedBehavior.kind,
    improvisedBehaviorKind: item.improvisedBehavior.kind,
    fittedDescription: item.fittedBehavior.description,
    improvisedDescription: item.improvisedBehavior.description,
  }));
}

