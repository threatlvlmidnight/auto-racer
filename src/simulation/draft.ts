import type { IdentityTag, OfferedItem } from "./types";

export function drawItem(
  pool: OfferedItem[],
  targetTag: IdentityTag,
  tagWeight: number,
  rng: () => number
): OfferedItem {
  const taggedItems = pool.filter((item) => item.identityTag === targetTag);
  const neutralItems = pool.filter((item) => item.identityTag !== targetTag);
  // 020-character-item-pools: no item in the new catalog sets identityTag
  // (identity-tag-deferred-retirement), so taggedItems is always empty for
  // it — without this guard, a coin flip landing on the (empty) tagged
  // branch would index out of bounds and return undefined. Behavior against
  // any pool with a non-empty taggedItems group (the old catalog) is
  // unchanged, since the guard is then always true.
  const selectedGroup = rng() < tagWeight && taggedItems.length > 0 ? taggedItems : neutralItems;
  const selectedIndex = Math.floor(rng() * selectedGroup.length);

  return selectedGroup[selectedIndex];
}