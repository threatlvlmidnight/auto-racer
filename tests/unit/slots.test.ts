import { describe, expect, it } from "vitest";
import { BASELINE_CAR, ITEM_POOL } from "../../src/content/sample-data";
import { addItem, evictAndAdd, hasOpenSlot } from "../../src/simulation/slots";
import { SLOT_CAPACITY, STORAGE_CAPACITY, type Build } from "../../src/simulation/types";

function emptyBuild(): Build {
  return {
    car: BASELINE_CAR,
    board: Array(SLOT_CAPACITY).fill(null),
    storage: Array(STORAGE_CAPACITY).fill(null),
  };
}

describe("hasOpenSlot", () => {
  it("reports open capacity until the flat cap is reached", () => {
    let build = emptyBuild();

    for (let index = 0; index < SLOT_CAPACITY; index += 1) {
      expect(hasOpenSlot(build)).toBe(true);
      build = addItem(build, ITEM_POOL[index], index);
    }

    expect(build.board).toEqual(ITEM_POOL.slice(0, SLOT_CAPACITY));
    expect(hasOpenSlot(build)).toBe(false);
  });
});

describe("addItem", () => {
  it("returns a new build with the item appended without mutating its inputs", () => {
    const build = emptyBuild();
    const item = ITEM_POOL[0];
    const buildSnapshot = structuredClone(build);
    const itemSnapshot = structuredClone(item);

    const result = addItem(build, item, 1);

    expect(result).not.toBe(build);
    expect(result.board).not.toBe(build.board);
    expect(result.board).toEqual([null, item, null]);
    expect(result.storage).toBe(build.storage);
    expect(build).toEqual(buildSnapshot);
    expect(item).toEqual(itemSnapshot);
  });

  it("leaves the same build reference untouched when an offer is declined", () => {
    const build = emptyBuild();
    const afterDecline = build;

    expect(afterDecline).toBe(build);
    expect(afterDecline.board).toEqual([null, null, null]);
  });
});

describe("evictAndAdd", () => {
  it("allows every held item to be replaced without changing build size", () => {
    const fullBuild: Build = {
      car: BASELINE_CAR,
      board: ITEM_POOL.slice(0, SLOT_CAPACITY),
      storage: Array(STORAGE_CAPACITY).fill(null),
    };
    const offeredItem = ITEM_POOL[SLOT_CAPACITY];

    fullBuild.board.forEach((_, evictIndex) => {
      const result = evictAndAdd(fullBuild, evictIndex, offeredItem);

      expect(result.board).toHaveLength(SLOT_CAPACITY);
      expect(result.board[evictIndex]).toBe(offeredItem);
      expect(result.board.filter((item) => item && !fullBuild.board.includes(item))).toEqual([
        offeredItem,
      ]);
    });
  });

  it("returns a new build and does not mutate the build or offered item", () => {
    const build: Build = {
      car: BASELINE_CAR,
      board: ITEM_POOL.slice(0, SLOT_CAPACITY),
      storage: Array(STORAGE_CAPACITY).fill(null),
    };
    const item = ITEM_POOL[SLOT_CAPACITY];
    const buildSnapshot = structuredClone(build);
    const itemSnapshot = structuredClone(item);

    const result = evictAndAdd(build, 1, item);

    expect(result).not.toBe(build);
    expect(result.board).not.toBe(build.board);
    expect(build).toEqual(buildSnapshot);
    expect(item).toEqual(itemSnapshot);
  });
});