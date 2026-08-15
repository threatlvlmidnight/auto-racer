import Phaser from "phaser";
import type { Run } from "../simulation/run";
import type { InventoryHost } from "../simulation/types";

interface InventorySceneData {
  run: Run;
  host: InventoryHost;
  returnScene: string;
  returnData: Readonly<Record<string, unknown>>;
}

/**
 * Compatibility route for existing Inventory buttons. The actual inventory is
 * the same authoritative garage board used by acquisition encounters, not a
 * second mock renderer with different item behavior.
 */
export class InventoryScene extends Phaser.Scene {
  constructor() { super("InventoryScene"); }

  create(data: InventorySceneData): void {
    this.scene.start("PrepareScene", {
      run: data.run,
      inventoryOnly: true,
      inventoryHost: data.host,
      returnScene: data.returnScene,
      returnData: data.returnData,
    });
  }
}
