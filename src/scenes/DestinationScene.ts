import Phaser from "phaser";
import { confirmRunDestination, type Run } from "../simulation/run";
import type { SelectableRegionId } from "../simulation/types";
import {
  addDemoBackdrop,
  addPaperPanel,
  applyPracticeFocusRing,
  createDemoButton,
  DISPLAY_FONT,
  UI_FONT,
  type PracticeFocusHandle,
} from "./demoTheme";
import { configureHiDpiScene, LOGICAL_WIDTH } from "./layout";
import { destinationChoiceModel } from "./worldTourPresentation";

export class DestinationScene extends Phaser.Scene {
  private run!: Run;
  private selected: SelectableRegionId | null = null;
  private focusRing?: PracticeFocusHandle;

  constructor() { super("DestinationScene"); }

  create(data: { run?: Run; selected?: SelectableRegionId } = {}): void {
    configureHiDpiScene(this);
    if (!data.run) { this.scene.start("EntrantSelectScene"); return; }
    this.run = data.run;
    this.selected = data.selected ?? null;
    addDemoBackdrop(this, "scene-route-headquarters", 0.58);
    this.render();
    this.input.keyboard?.on("keydown-ESC", () => this.back());
    this.input.keyboard?.on("keydown-ENTER", () => this.confirm());
    this.input.keyboard?.on("keydown-ONE", () => this.select(0));
    this.input.keyboard?.on("keydown-TWO", () => this.select(1));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.focusRing?.destroy());
  }

  private render(): void {
    const model = destinationChoiceModel(this.run);
    this.add.text(LOGICAL_WIDTH / 2, 28, "CHOOSE THE NEXT TOUR LEG", {
      fontFamily: DISPLAY_FONT, fontSize: "24px", fontStyle: "bold", color: "#f4d58d",
    }).setOrigin(0.5);
    this.add.text(LOGICAL_WIDTH / 2, 58, "The route is revealed one destination at a time. Paris awaits as the finale.", {
      fontFamily: UI_FONT, fontSize: "13px", color: "#d7e1e6",
    }).setOrigin(0.5);
    if (model.status === "unavailable") {
      this.add.text(LOGICAL_WIDTH / 2, 210, model.reason!, { fontFamily: UI_FONT, fontSize: "16px", color: "#d9a7a7" }).setOrigin(0.5);
      createDemoButton(this, LOGICAL_WIDTH / 2, 300, "BACK", () => this.back());
      return;
    }
    const buttons: Phaser.GameObjects.Text[] = [];
    model.cards.forEach((card, index) => {
      const x = index === 0 ? 220 : 580;
      addPaperPanel(this, x, 225, 320, 270, 0.92);
      this.add.text(x, 110, `${index + 1} · ${card.name.toUpperCase()}`, {
        fontFamily: DISPLAY_FONT, fontSize: "19px", fontStyle: "bold", color: this.selected === card.regionId ? "#ffd447" : "#f1eee5",
      }).setOrigin(0.5);
      this.add.text(x, 160, card.visualTheme, { fontFamily: UI_FONT, fontSize: "13px", color: "#d7e1e6", align: "center", wordWrap: { width: 276 } }).setOrigin(0.5);
      this.add.text(x, 225, `Engineering tendency\n${card.engineeringTendency}`, { fontFamily: UI_FONT, fontSize: "13px", color: "#cddbd2", align: "center", wordWrap: { width: 276 } }).setOrigin(0.5);
      this.add.text(x, 290, card.cadence, { fontFamily: UI_FONT, fontSize: "12px", color: "#9eb5c9", align: "center", wordWrap: { width: 276 } }).setOrigin(0.5);
      buttons.push(createDemoButton(this, x, 340, this.selected === card.regionId ? "SELECTED" : "SELECT", () => {
        this.selected = card.regionId as SelectableRegionId;
        this.scene.restart({ run: this.run, selected: this.selected });
      }, true, { repeatable: true }));
    });
    const back = createDemoButton(this, 260, 420, "BACK", () => this.back());
    const confirm = createDemoButton(this, 540, 420, "CONFIRM TRAVEL", () => this.confirm(), this.selected !== null);
    createDemoButton(this, 730, 400, "INVENTORY", () => this.scene.start("InventoryScene", {
      run: this.run, host: "destination", returnScene: "DestinationScene", returnData: { selected: this.selected },
    }), true, { fontSize: "10px", width: 112, height: 30 });
    this.focusRing = applyPracticeFocusRing(this, [...buttons, back, confirm]);
  }

  private select(index: number): void {
    const card = destinationChoiceModel(this.run).cards[index];
    if (card) { this.selected = card.regionId as SelectableRegionId; this.confirm(); }
  }

  private confirm(): void {
    if (!this.selected || !this.run.worldTour) return;
    this.scene.start("RunScene", { run: confirmRunDestination(this.run, this.selected, Math.random) });
  }

  private back(): void { this.scene.start("RunScene", { run: this.run }); }
}
