import type { ItemDefinition, VehicleBuild } from "./types";

export function hasOpenStorageSlot(build: VehicleBuild): boolean {
  return build.storage.some((position) => position.item === null);
}

export function addItemToStorage(
  build: VehicleBuild,
  item: ItemDefinition,
  storageIndex: number
): VehicleBuild {
  const position = build.storage[storageIndex];
  if (!position || position.item !== null) {
    throw new Error(`Cannot add an item to storage slot ${storageIndex}`);
  }

  return {
    ...build,
    storage: build.storage.map((position, index) =>
      (index === storageIndex ? { ...position, item } : position)),
  };
}

export function moveToStorage(
  build: VehicleBuild,
  slotIndex: number,
  storageIndex: number
): VehicleBuild {
  const item = build.slots[slotIndex]?.item ?? null;
  const target = build.storage[storageIndex];
  if (!item || !target || target.item !== null) {
    throw new Error(`Cannot move vehicle slot ${slotIndex} to storage slot ${storageIndex}`);
  }

  return {
    ...build,
    slots: build.slots.map((slot, index) => (index === slotIndex ? { ...slot, item: null } : slot)),
    storage: build.storage.map((position, index) =>
      (index === storageIndex ? { ...position, item } : position)),
  };
}

export function moveToBoard(
  build: VehicleBuild,
  storageIndex: number,
  slotIndex: number
): VehicleBuild {
  const item = build.storage[storageIndex]?.item ?? null;
  const target = build.slots[slotIndex];
  if (!item || !target || target.item !== null) {
    throw new Error(`Cannot move storage slot ${storageIndex} to vehicle slot ${slotIndex}`);
  }

  return {
    ...build,
    slots: build.slots.map((slot, index) => (index === slotIndex ? { ...slot, item } : slot)),
    storage: build.storage.map((position, index) =>
      (index === storageIndex ? { ...position, item: null } : position)),
  };
}

export function swapBoardStorage(
  build: VehicleBuild,
  slotIndex: number,
  storageIndex: number
): VehicleBuild {
  const slotItem = build.slots[slotIndex]?.item ?? null;
  const storedItem = build.storage[storageIndex]?.item ?? null;
  if (!slotItem || !storedItem) {
    throw new Error(`Cannot swap vehicle slot ${slotIndex} with storage slot ${storageIndex}`);
  }

  return {
    ...build,
    slots: build.slots.map((slot, index) =>
      (index === slotIndex ? { ...slot, item: storedItem } : slot)),
    storage: build.storage.map((position, index) =>
      (index === storageIndex ? { ...position, item: slotItem } : position)),
  };
}
