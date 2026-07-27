import type { IdentityTag, OfferedItem } from "./types";

export function drawItem(
  pool: OfferedItem[],
  targetTag: IdentityTag,
  tagWeight: number,
  rng: () => number
): OfferedItem {
  const taggedItems = pool.filter((item) => item.identityTag === targetTag);
  const neutralItems = pool.filter((item) => item.identityTag !== targetTag);
  const selectedGroup = rng() < tagWeight ? taggedItems : neutralItems;
  const selectedIndex = Math.floor(rng() * selectedGroup.length);

  return selectedGroup[selectedIndex];
}