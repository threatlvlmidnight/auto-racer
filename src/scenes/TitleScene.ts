import Phaser from "phaser";
import { canEnterEntrantSelection } from "../simulation/run";
import { createDemoButton, DEMO_COLORS, DISPLAY_FONT, UI_FONT } from "./demoTheme";
import { configureHiDpiScene } from "./layout";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(): void {
    configureHiDpiScene(this);
    this.add.image(400, 225, "scene-race-start").setDisplaySize(800, 450);
    this.add.rectangle(400, 225, 800, 450, DEMO_COLORS.ink, 0.28);
    this.add.rectangle(400, 104, 800, 164, DEMO_COLORS.ink, 0.78);
    this.add.rectangle(400, 186, 800, 2, DEMO_COLORS.silver, 0.82);

    this.add.text(400, 34, "THE INAUGURAL 1901 CHAMPIONSHIP", {
      fontFamily: UI_FONT,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#d9483f",
    }).setOrigin(0.5);
    this.add.text(400, 78, "THE MOTOR AGE", {
      fontFamily: DISPLAY_FONT,
      fontSize: "38px",
      fontStyle: "bold",
      color: "#f1eee5",
      stroke: "#172426",
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(400, 132, "Build the machine. Make history.", {
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
      color: "#b8c0c2",
    }).setOrigin(0.5);
  }
}
