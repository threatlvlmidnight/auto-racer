import Phaser from "phaser";
import { invalidateSaleUndo, sellInventoryItem, undoSoldItem } from "../simulation/encounters";
import type { Run } from "../simulation/run";
import type { InventoryHost } from "../simulation/types";
import { createDemoButton, DISPLAY_FONT, UI_FONT } from "./demoTheme";
import { createInventoryVisuals } from "./inventoryVisuals";
import { configureHiDpiScene, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./layout";

interface InventorySceneData {
  run: Run;
  host: InventoryHost;
  returnScene: string;
  returnData: Readonly<Record<string, unknown>>;
}

/** Shared full-window inventory host. It returns the exact opaque host payload with only `run` replaced. */
export class InventoryScene extends Phaser.Scene {
  private run!: Run;
  private host!: InventoryHost;
  private returnScene!: string;
  private returnData!: Readonly<Record<string, unknown>>;

  constructor() { super("InventoryScene"); }

  create(data: InventorySceneData): void {
    configureHiDpiScene(this);
    this.run = data.run;
    this.host = data.host;
    this.returnScene = data.returnScene;
    this.returnData = data.returnData;
    this.render();
    this.input.keyboard?.once("keydown-ESC", () => this.close());
  }

  private render(): void {
    this.children.removeAll(true);
    this.add.rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x10181c, 0.98).setOrigin(0);
    this.add.text(LOGICAL_WIDTH / 2, 24, "INVENTORY", {
      fontFamily: DISPLAY_FONT, fontSize: "24px", color: "#f4d58d",
    }).setOrigin(0.5);
    this.add.text(LOGICAL_WIDTH / 2, 48, `From ${this.host.replace(/-/g, " ")} · ${this.run.credits} credits`, {
      fontFamily: UI_FONT, fontSize: "11px", color: "#d7e4e7",
    }).setOrigin(0.5);
    createInventoryVisuals(this, this.run.build, {
      bounds: { x: 20, y: 62, width: LOGICAL_WIDTH - 40, height: LOGICAL_HEIGHT - 120 },
      onSell: (source) => {
        try { this.run = sellInventoryItem(this.run, source); this.render(); } catch { /* empty position */ }
      },
      onUndo: () => {
        const contextId = this.run.activeEncounter?.id ?? `${this.run.id}-inventory-${this.run.stageIndex}`;
        try { this.run = undoSoldItem(this.run, contextId); this.render(); } catch { /* stale Undo */ }
      },
    }, this.run.saleUndo);
    createDemoButton(this, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 24, "RETURN", () => this.close());
  }

  private close(): void {
    const run = invalidateSaleUndo(this.run);
    this.scene.start(this.returnScene, { ...this.returnData, run });
  }
}
