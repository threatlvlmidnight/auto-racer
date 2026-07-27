import type { Build, OfferedItem } from "./types";

export function hasOpenStorageSlot(build: Build): boolean {
  return build.storage.some((slot) => slot === null);
}

export function addItemToStorage(
  build: Build,
  item: OfferedItem,
  storageIndex: number
): Build {
  if (build.storage[storageIndex] !== null) {
    throw new Error(`Cannot add an item to storage slot ${storageIndex}`);
  }

  return {
    ...build,
    storage: build.storage.map((slot, index) => (index === storageIndex ? item : slot)),
  };
}

export function moveToStorage(build: Build, boardIndex: number, storageIndex: number): Build {
  const item = build.board[boardIndex];
  if (!item || build.storage[storageIndex] !== null) {
    throw new Error(`Cannot move board slot ${boardIndex} to storage slot ${storageIndex}`);
  }

  return {
    ...build,
    board: build.board.map((slot, index) => (index === boardIndex ? null : slot)),
    storage: build.storage.map((slot, index) => (index === storageIndex ? item : slot)),
  };
}

export function moveToBoard(build: Build, storageIndex: number, boardIndex: number): Build {
  const item = build.storage[storageIndex];
  if (!item || build.board[boardIndex] !== null) {
    throw new Error(`Cannot move storage slot ${storageIndex} to board slot ${boardIndex}`);
  }

  return {
    ...build,
    board: build.board.map((slot, index) => (index === boardIndex ? item : slot)),
    storage: build.storage.map((slot, index) => (index === storageIndex ? null : slot)),
  };
}

export function swapBoardStorage(
  build: Build,
  boardIndex: number,
  storageIndex: number
): Build {
  const boardItem = build.board[boardIndex];
  const storageItem = build.storage[storageIndex];
  if (!boardItem || !storageItem) {
    throw new Error(`Cannot swap board slot ${boardIndex} with storage slot ${storageIndex}`);
  }

  return {
    ...build,
    board: build.board.map((slot, index) => (index === boardIndex ? storageItem : slot)),
    storage: build.storage.map((slot, index) => (index === storageIndex ? boardItem : slot)),
  };
}