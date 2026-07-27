import { describe, expect, it } from "vitest";
import {
  addItemToStorage,
  hasOpenStorageSlot,
  moveToBoard,
  moveToStorage,
  swapBoardStorage,
} from "../../src/simulation/storage";
import type { Build, OfferedItem } from "../../src/simulation/types";

const BOARD_ITEM: OfferedItem = { id: "board", name: "Board Item", timeModifier: -1 };
const STORAGE_ITEM: OfferedItem = { id: "storage", name: "Storage Item", timeModifier: -2 };
const OFFERED_ITEM: OfferedItem = { id: "offered", name: "Offered Item", timeModifier: -3 };

function fixtureBuild(): Build {
  return {
    car: { id: "test-car", baseLapTime: 6 },
    board: [BOARD_ITEM, null, null],
    storage: [STORAGE_ITEM, null, null],
  };
}

describe("storage movement", () => {
  it("detects open storage capacity", () => {
    expect(hasOpenStorageSlot(fixtureBuild())).toBe(true);
    expect(hasOpenStorageSlot({ ...fixtureBuild(), storage: [STORAGE_ITEM, BOARD_ITEM, STORAGE_ITEM] })).toBe(false);
  });

  it("places an offered item into a specific open storage slot", () => {
    const build = fixtureBuild();
    const snapshot = structuredClone(build);
    const result = addItemToStorage(build, OFFERED_ITEM, 2);

    expect(result.storage).toEqual([STORAGE_ITEM, null, OFFERED_ITEM]);
    expect(result.board).toBe(build.board);
    expect(build).toEqual(snapshot);
  });

  it("moves a board item into a specific open storage slot", () => {
    const build = fixtureBuild();
    const snapshot = structuredClone(build);
    const result = moveToStorage(build, 0, 2);

    expect(result.board).toEqual([null, null, null]);
    expect(result.storage).toEqual([STORAGE_ITEM, null, BOARD_ITEM]);
    expect(result.board).toHaveLength(build.board.length);
    expect(result.storage).toHaveLength(build.storage.length);
    expect(build).toEqual(snapshot);
  });

  it("moves a stored item into a specific open board slot", () => {
    const build = fixtureBuild();
    const snapshot = structuredClone(build);
    const result = moveToBoard(build, 0, 2);

    expect(result.board).toEqual([BOARD_ITEM, null, STORAGE_ITEM]);
    expect(result.storage).toEqual([null, null, null]);
    expect(build).toEqual(snapshot);
  });

  it("swaps occupied board and storage slots without losing either item", () => {
    const build = fixtureBuild();
    const result = swapBoardStorage(build, 0, 0);

    expect(result.board[0]).toBe(STORAGE_ITEM);
    expect(result.storage[0]).toBe(BOARD_ITEM);
    expect(swapBoardStorage(result, 0, 0)).toEqual(build);
  });
});