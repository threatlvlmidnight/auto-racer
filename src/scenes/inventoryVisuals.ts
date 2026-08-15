import Phaser from "phaser";
import type { VehicleBuild, SaleUndoSnapshot } from "../simulation/types";
import { inventoryLayoutModel, type InventorySafeBounds } from "./inventoryPresentation";
import { garageSlotModels } from "./garagePresentation";

export interface InventoryVisualOptions {
  bounds: InventorySafeBounds;
  onSell: (source: { area: "vehicle"; slotId: string } | { area: "storage"; index: number }) => void;
  onUndo: () => void;
}

/** Shared inventory projection used by every eligible host scene. */
export function inventoryBoardModel(build: VehicleBuild): ReturnType<typeof garageSlotModels> {
  return garageSlotModels(build);
}

/** Render the common board/storage/sell/Undo affordances without owning mutation. */
export function createInventoryVisuals(
  scene: Phaser.Scene,
  build: VehicleBuild,
  options: InventoryVisualOptions,
  undo: SaleUndoSnapshot | undefined,
): Phaser.GameObjects.Container {
  const layout = inventoryLayoutModel("overlay", options.bounds);
  const children: Phaser.GameObjects.GameObject[] = [];
  const board = layout.regions.find((region) => region.id === "board")!;
  const storage = layout.regions.find((region) => region.id === "storage")!;
  scene.add.text(board.x + 8, board.y + 8, "VEHICLE · drag or select an item", { fontSize: "11px", color: "#d7e4e7" });
  build.slots.forEach((slot, index) => {
    const x = board.x + 12 + index * Math.max(48, Math.floor((board.width - 24) / Math.max(1, build.slots.length)));
    const card = scene.add.rectangle(x, board.y + 42, 44, 34, slot.item ? 0x263640 : 0x171d21).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    card.setData("source", { area: "vehicle", slotId: slot.slotId });
    card.on("pointerdown", () => options.onSell({ area: "vehicle", slotId: slot.slotId }));
    children.push(card);
  });
  scene.add.text(storage.x + 8, storage.y + 8, "STORAGE", { fontSize: "11px", color: "#8fd8ff" });
  build.storage.forEach((position, index) => {
    const card = scene.add.rectangle(storage.x + 12 + index * 54, storage.y + 28, 44, 34, position.item ? 0x263640 : 0x171d21).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    card.setData("source", { area: "storage", index: position.index });
    card.on("pointerdown", () => options.onSell({ area: "storage", index: position.index }));
    children.push(card);
  });
  const undoRegion = layout.regions.find((region) => region.id === "undo")!;
  const undoButton = scene.add.text(undoRegion.x + 6, undoRegion.y + 8, undo?.valid ? "UNDO SALE" : "UNDO UNAVAILABLE", { fontSize: "10px", color: undo?.valid ? "#82c9aa" : "#71808a" }).setInteractive({ useHandCursor: Boolean(undo?.valid) });
  if (undo?.valid) scene.add.text(undoRegion.x + 6, undoRegion.y + 24, `PAYOUT +${undo.receipt.totalPayout} credits`, { fontSize: "8px", color: "#d7e4e7" });
  if (undo?.valid) undoButton.on("pointerdown", options.onUndo);
  children.push(undoButton);
  return scene.add.container(0, 0, children).setData("inventoryLayout", layout);
}
