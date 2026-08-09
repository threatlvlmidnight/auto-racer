import Phaser from "phaser";
import { DISPLAY_FONT } from "./demoTheme";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.cameras.main.setBackgroundColor("#172426");
    this.add.text(400, 208, "Preparing the starting line...", {
      fontFamily: DISPLAY_FONT,
      fontSize: "20px",
      color: "#eadcb5",
    }).setOrigin(0.5);
    this.add.rectangle(400, 244, 260, 3, 0x3b4e4c);
    const progress = this.add.rectangle(271, 244, 2, 3, 0xd8b45a).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => progress.setDisplaySize(258 * value, 3));

    this.load.image("title-race", "/assets/title-race.svg");
    this.load.image("championship-paddock", "/assets/championship-paddock.svg");
    this.load.image("workshop", "/assets/workshop.svg");
    this.load.image("race-day", "/assets/race-day.svg");
    this.load.image("player-vehicle", "/assets/player-vehicle.svg");
    this.load.image("rival-vehicle", "/assets/rival-vehicle.svg");

    // Entrant portraits and named-vehicle silhouettes (feature 010). Local
    // placeholders: they must load with no network access.
    (["evelyn-mercer", "lucien-soto", "inez-rook", "nell-voss"] as const).forEach((id) => {
      this.load.image(`entrant-${id}`, `/assets/entrants/${id}.svg`);
    });
    (["the-highwheel", "the-needle", "the-lark", "the-hush"] as const).forEach((id) => {
      this.load.image(`vehicle-${id}`, `/assets/vehicles/${id}.svg`);
    });
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}
