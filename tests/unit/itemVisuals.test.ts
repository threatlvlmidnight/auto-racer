import { describe, expect, it } from "vitest";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import { itemTagVisualMetadata, itemVisualDescriptor } from "../../src/scenes/itemVisualDescriptor";
import { EXCLUSIVE_ITEMS, NEUTRAL_ITEMS } from "../../src/content/items";

describe("itemVisualDescriptor", () => {
  it("distinguishes direct, flat, stacking, and count-synergy behavior", () => {
    const direct = LEGACY_ITEM_POOL.find((item) => !item.buff)!;
    const flat = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown === undefined && !item.buff.perCount)!;
    const stacking = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown !== undefined)!;
    const count = LEGACY_ITEM_POOL.find((item) => item.buff?.perCount)!;

    expect(itemVisualDescriptor(direct).kind).toBe("direct");
    expect(itemVisualDescriptor(flat).kind).toBe("flat-buff");
    expect(itemVisualDescriptor(stacking).kind).toBe("stacking-buff");
    expect(itemVisualDescriptor(count).kind).toBe("count-synergy");
  });

  it("uses the visible one-lap convention and preserves category flags", () => {
    const flat = LEGACY_ITEM_POOL.find((item) => item.buff && item.cooldown === undefined)!;
    const stored = LEGACY_ITEM_POOL.find((item) => item.activeWhileStored)!;

    expect(itemVisualDescriptor(flat)).toMatchObject({
      performance: true,
      cooldown: 1,
    });
    expect(itemVisualDescriptor(stored).activeWhileStored).toBe(true);
  });

  it("gives every authored catalog tag a stable label and unique icon token", () => {
    const catalog = [...NEUTRAL_ITEMS, ...Object.values(EXCLUSIVE_ITEMS).flat()];
    const tags = [...new Set(catalog.flatMap((item) => item.synergyTags))];
    const metadata = tags.map(itemTagVisualMetadata);
    expect(metadata.every((entry) => entry.label.length > 0)).toBe(true);
    expect(new Set(metadata.map((entry) => entry.iconToken)).size).toBe(tags.length);
    catalog.forEach((item) => expect(itemVisualDescriptor(item).tags.length).toBe(item.synergyTags.length));
  });
});
