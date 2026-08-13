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
