import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";

describe("ITEM_POOL", () => {
  it("contains 10 to 20 uniquely identified and named items", () => {
    expect(ITEM_POOL.length).toBeGreaterThanOrEqual(10);
    expect(ITEM_POOL.length).toBeLessThanOrEqual(20);
    expect(new Set(ITEM_POOL.map((item) => item.id)).size).toBe(ITEM_POOL.length);
    expect(new Set(ITEM_POOL.map((item) => item.name)).size).toBe(ITEM_POOL.length);
  });

  it("gives every direct item a unique modifier magnitude", () => {
    const directMagnitudes = ITEM_POOL.filter((item) => !item.buff).map((item) =>
      Math.abs(item.timeModifier)
    );

    expect(new Set(directMagnitudes).size).toBe(directMagnitudes.length);
  });

  it("contains flat and stacking zero-modifier Performance buffs", () => {
    const buffItems = ITEM_POOL.filter((item) => item.buff);
    const flatBuff = buffItems.find((item) => item.cooldown === undefined);
    const stackingBuff = buffItems.find((item) => item.cooldown !== undefined);

    expect(buffItems).toHaveLength(2);
    buffItems.forEach((item) => expect(item).toMatchObject({
      identityTag: "performance",
      timeModifier: 0,
    }));
    expect(flatBuff?.buff?.boostPercent).toBeGreaterThan(0);
    expect(stackingBuff?.buff?.boostPercent).toBeGreaterThan(0);
    expect(stackingBuff?.cooldown).toBeGreaterThan(1);
  });

  it("gives every direct item a cooldown with both cadence kinds represented", () => {
    const directItems = ITEM_POOL.filter((item) => !item.buff);

    directItems.forEach((item) => expect(item.cooldown).toBeGreaterThanOrEqual(1));
    expect(directItems.some((item) => item.cooldown === 1)).toBe(true);
    expect(directItems.some((item) => (item.cooldown ?? 0) > 1)).toBe(true);
  });

  it("contains exactly one item that remains active in storage", () => {
    const activeStorageItems = ITEM_POOL.filter((item) => item.activeWhileStored);

    expect(activeStorageItems).toHaveLength(1);
  });
});