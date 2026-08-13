import { describe, expect, it } from "vitest";
import { LEGACY_ITEM_POOL } from "../fixtures/legacy-item-pool";
import { itemVisualDescriptor } from "../../src/scenes/itemVisualDescriptor";

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
});