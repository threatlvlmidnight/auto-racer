import Phaser from "phaser";
import { DISPLAY_FONT } from "./demoTheme";
import { configureHiDpiScene } from "./layout";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    configureHiDpiScene(this);
    this.cameras.main.setBackgroundColor("#172426");
    this.add.text(400, 208, "Preparing the starting line...", {
      fontFamily: DISPLAY_FONT,
      fontSize: "20px",
      color: "#f1eee5",
    }).setOrigin(0.5);
    this.add.rectangle(400, 244, 260, 3, 0x3b4e4c);
    const progress = this.add.rectangle(271, 244, 2, 3, 0xb83232).setOrigin(0, 0.5);
    this.load.on("progress", (value: number) => progress.setDisplaySize(258 * value, 3));

    this.load.image("title-race", "/assets/title-race.svg");
    this.load.image("championship-paddock", "/assets/championship-paddock.svg");
    this.load.image("workshop", "/assets/workshop.svg");
    this.load.image("race-day", "/assets/race-day.svg");
    this.load.image("player-vehicle", "/assets/player-vehicle.svg");
    this.load.image("rival-vehicle", "/assets/rival-vehicle.svg");

    // Feature 026 production-intent environment masters. They remain local so
    // the complete presentation works offline.
    this.load.image("scene-race-start", "/assets/backgrounds/scenes/championship-race-start.png");
    this.load.image("scene-route-headquarters", "/assets/backgrounds/scenes/championship-route-headquarters.png");
    this.load.image("scene-sponsor-negotiation", "/assets/backgrounds/scenes/sponsor-negotiation.png");
    this.load.image("scene-road-circuit", "/assets/backgrounds/scenes/road-circuit.png");
    this.load.image("scene-finish-line", "/assets/backgrounds/scenes/finish-line-aftermath.png");
    this.load.image("scene-pre-race-setup", "/assets/backgrounds/scenes/pre-race-setup.png");
    this.load.image("region-british-isles", "/assets/backgrounds/regions/british-isles.png");
    this.load.image("region-continental-europe", "/assets/backgrounds/regions/continental-europe.png");
    this.load.image("region-north-america", "/assets/backgrounds/regions/north-america.png");
    this.load.image("region-south-america", "/assets/backgrounds/regions/south-america.png");
    this.load.image("region-northern-europe", "/assets/backgrounds/regions/northern-europe.png");
    this.load.image("region-mediterranean-north-africa", "/assets/backgrounds/regions/mediterranean-north-africa.png");
    this.load.image("region-paris-exhibition", "/assets/backgrounds/regions/paris-exhibition.png");

    const entrants = ["evelyn-mercer", "lucien-soto", "inez-rook", "nell-voss"] as const;
    entrants.forEach((id) => {
      this.load.image(`garage-${id}`, `/assets/backgrounds/garages/${id}-${{
        "evelyn-mercer": "highwheel",
        "lucien-soto": "needle",
        "inez-rook": "lark",
        "nell-voss": "hush",
      }[id]}.png`);
    });

    // Production portraits and named-vehicle cutouts replace the feature 010
    // SVG placeholders while preserving their stable texture keys.
    entrants.forEach((id) => {
      this.load.image(`entrant-${id}`, `/assets/portraits/generated/${id}.png`);
    });
    (["the-highwheel", "the-needle", "the-lark", "the-hush"] as const).forEach((id) => {
      this.load.image(`vehicle-${id}`, `/assets/vehicles/generated/${id}.png`);
    });

    (["coachworks", "velodrome", "fieldworks", "backroads"] as const).forEach((origin) => {
      (["power", "chassis"] as const).forEach((category) => {
        this.load.image(`item-family-${origin}-${category}`, `/assets/items/families/${origin}-${category}.png`);
      });
    });
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}
