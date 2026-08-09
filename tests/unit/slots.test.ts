import { describe, expect, it } from "vitest";
import { ITEM_POOL } from "../../src/content/sample-data";
import { addItem, evictAndAdd, hasOpenSlot, installedItems } from "../../src/simulation/slots";
import { type Build } from "../../src/simulation/types";
import { TEST_SLOT_COUNT, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

function emptyBuild(): Build {
  return vehicleBuild();
}

describe("hasOpenSlot", () => {
  it("reports open capacity until the vehicle's slot count is reached", () => {
    let build = emptyBuild();

    for (let index = 0; index < TEST_SLOT_COUNT; index += 1) {
      expect(hasOpenSlot(build)).toBe(true);
      build = addItem(build, ITEM_POOL[index], index);
    }

    expect(installedItems(build)).toEqual(ITEM_POOL.slice(0, TEST_SLOT_COUNT));
    expect(hasOpenSlot(build)).toBe(false);
  });
});

describe("addItem", () => {
  it("returns a new build with the item installed without mutating its inputs", () => {
    const build = emptyBuild();
    const item = ITEM_POOL[0];
    const buildSnapshot = structuredClone(build);
    const itemSnapshot = structuredClone(item);

    const result = addItem(build, item, 1);

    expect(result).not.toBe(build);
    expect(result.slots).not.toBe(build.slots);
    expect(installedItems(result)).toEqual([null, item, ...Array(TEST_SLOT_COUNT - 2).fill(null)]);
    expect(result.storage).toBe(build.storage);
    expect(build).toEqual(buildSnapshot);
    expect(item).toEqual(itemSnapshot);
  });

  it("preserves the authored slot ID and type of the slot it fills", () => {
    const build = emptyBuild();
    const result = addItem(build, ITEM_POOL[0], 1);

    expect(result.slots[1].slotId).toBe(build.slots[1].slotId);
    expect(result.slots[1].slotType).toBe(build.slots[1].slotType);
  });

  it("leaves the same build reference untouched when an offer is declined", () => {
    const build = emptyBuild();
    const afterDecline = build;

    expect(afterDecline).toBe(build);
    expect(installedItems(afterDecline)).toEqual(Array(TEST_SLOT_COUNT).fill(null));
  });
});

describe("evictAndAdd", () => {
  it("allows every installed item to be replaced without changing build size", () => {
    const fullBuild = vehicleBuild(ITEM_POOL.slice(0, TEST_SLOT_COUNT));
    const offeredItem = ITEM_POOL[TEST_SLOT_COUNT];

    fullBuild.slots.forEach((_slot, evictIndex) => {
      const result = evictAndAdd(fullBuild, evictIndex, offeredItem);
      const resultItems = installedItems(result);
      const originalItems = installedItems(fullBuild);

      expect(result.slots).toHaveLength(TEST_SLOT_COUNT);
      expect(resultItems[evictIndex]).toBe(offeredItem);
      expect(resultItems.filter((item) => item && !originalItems.includes(item))).toEqual([
        offeredItem,
      ]);
    });
  });

  it("returns a new build and does not mutate the build or offered item", () => {
    const build = vehicleBuild(ITEM_POOL.slice(0, TEST_SLOT_COUNT));
    const item = ITEM_POOL[TEST_SLOT_COUNT];
    const buildSnapshot = structuredClone(build);
    const itemSnapshot = structuredClone(item);

    const result = evictAndAdd(build, 1, item);

    expect(result).not.toBe(build);
    expect(result.slots).not.toBe(build.slots);
    expect(build).toEqual(buildSnapshot);
    expect(item).toEqual(itemSnapshot);
  });
});
