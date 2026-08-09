import { describe, expect, it } from "vitest";
import {
  addItemToStorage,
  hasOpenStorageSlot,
  moveToBoard,
  moveToStorage,
  swapBoardStorage,
} from "../../src/simulation/storage";
import type { Build, OfferedItem } from "../../src/simulation/types";
import { installedItems, storedItems } from "../../src/simulation/slots";
import { TEST_SLOT_COUNT, testItem, vehicleBuild } from "../fixtures/vehicle-build-fixtures";

const BOARD_ITEM: OfferedItem = testItem({ id: "board", name: "Board Item", price: 2, timeModifier: -1 });
const STORAGE_ITEM: OfferedItem = testItem({ id: "storage", name: "Storage Item", price: 2, timeModifier: -2 });
const OFFERED_ITEM: OfferedItem = testItem({ id: "offered", name: "Offered Item", price: 2, timeModifier: -3 });

const EMPTY_SLOTS = Array(TEST_SLOT_COUNT).fill(null);

function fixtureBuild(): Build {
  return vehicleBuild([BOARD_ITEM], [STORAGE_ITEM]);
}

describe("storage movement", () => {
  it("detects open storage capacity", () => {
    expect(hasOpenStorageSlot(fixtureBuild())).toBe(true);
    expect(hasOpenStorageSlot(vehicleBuild([BOARD_ITEM], [STORAGE_ITEM, BOARD_ITEM, STORAGE_ITEM]))).toBe(false);
  });

  it("places an offered item into a specific open storage slot", () => {
    const build = fixtureBuild();
    const snapshot = structuredClone(build);
    const result = addItemToStorage(build, OFFERED_ITEM, 2);

    expect(storedItems(result)).toEqual([STORAGE_ITEM, null, OFFERED_ITEM]);
    expect(result.slots).toBe(build.slots);
    expect(build).toEqual(snapshot);
  });

  it("moves a board item into a specific open storage slot", () => {
    const build = fixtureBuild();
    const snapshot = structuredClone(build);
    const result = moveToStorage(build, 0, 2);

    expect(installedItems(result)).toEqual(EMPTY_SLOTS);
    expect(storedItems(result)).toEqual([STORAGE_ITEM, null, BOARD_ITEM]);
    expect(result.slots).toHaveLength(build.slots.length);
    expect(result.storage).toHaveLength(build.storage.length);
    expect(build).toEqual(snapshot);
  });

  it("moves a stored item into a specific open board slot", () => {
    const build = fixtureBuild();
    const snapshot = structuredClone(build);
    const result = moveToBoard(build, 0, 2);

    expect(installedItems(result)).toEqual([BOARD_ITEM, null, STORAGE_ITEM, null]);
    expect(storedItems(result)).toEqual([null, null, null]);
    expect(build).toEqual(snapshot);
  });

  it("swaps occupied board and storage slots without losing either item", () => {
    const build = fixtureBuild();
    const result = swapBoardStorage(build, 0, 0);

    expect(result.slots[0].item).toBe(STORAGE_ITEM);
    expect(result.storage[0].item).toBe(BOARD_ITEM);
    expect(swapBoardStorage(result, 0, 0)).toEqual(build);
  });
});