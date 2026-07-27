import type { Build, OfferedItem } from "./types";

export function hasOpenSlot(build: Build): boolean {
  return build.board.some((slot) => slot === null);
}

export function addItem(build: Build, item: OfferedItem, boardIndex: number): Build {
  if (build.board[boardIndex] !== null) {
    throw new Error(`Cannot add an item to board slot ${boardIndex}`);
  }

  return {
    ...build,
    board: build.board.map((slot, index) => (index === boardIndex ? item : slot)),
  };
}

export function evictAndAdd(build: Build, evictIndex: number, item: OfferedItem): Build {
  if (evictIndex < 0 || evictIndex >= build.board.length || build.board[evictIndex] === null) {
    throw new RangeError(`Invalid eviction index: ${evictIndex}`);
  }

  return {
    ...build,
    board: build.board.map((heldItem, index) => (index === evictIndex ? item : heldItem)),
  };
}