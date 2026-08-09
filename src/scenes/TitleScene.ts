import Phaser from "phaser";
import { canEnterEntrantSelection } from "../simulation/run";
import { createDemoButton, DEMO_COLORS, DISPLAY_FONT, UI_FONT } from "./demoTheme";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.add.image(400, 225, "title-race").setDisplaySize(800, 450);
    this.add.rectangle(400, 225, 800, 450, DEMO_COLORS.ink, 0.28);
    this.add.rectangle(400, 104, 800, 164, DEMO_COLORS.ink, 0.78);
    this.add.rectangle(400, 186, 800, 3, DEMO_COLORS.brass, 0.9);

    this.add.text(400, 34, "NEW YEAR'S DAY · 1901", {
      fontFamily: UI_FONT,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#d8b45a",
    }).setOrigin(0.5);
    this.add.text(400, 78, "THE FIRST AUTO RACE", {
      fontFamily: DISPLAY_FONT,
      fontSize: "38px",
      fontStyle: "bold",
      color: "#f3e5bd",
      stroke: "#172426",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(400, 132, "Four builders. Any machine. One finish line.", {
      fontFamily: UI_FONT,
      fontSize: "16px",
      color: "#dce4d8",
    }).setOrigin(0.5);

    // Begin always routes through deliberate entrant selection; no run exists
    // yet at the title screen, so the guard is trivially allowed here.
    createDemoButton(this, 400, 365, "BEGIN THE CHAMPIONSHIP", () => {
      const guard = canEnterEntrantSelection(null);
      if (guard.kind === "blocked") return;
      this.scene.start("EntrantSelectScene");
    });
    this.add.text(400, 414, "DEMONSTRATION BUILD", {
      fontFamily: UI_FONT,
      fontSize: "10px",
      color: "#eadcb5",
    }).setOrigin(0.5);
  }
}
