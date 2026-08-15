import Phaser from "phaser";
import { runtimeAssetUrl } from "../buildIdentity";
import { DISPLAY_FONT } from "./demoTheme";
import { configureHiDpiScene } from "./layout";
import { registerUIChromeTextureFrames, UI_CHROME_MASTER_TEXTURE_KEY } from "./uiChrome";
import {
  registerRunChromeTextureFrames,
  RUN_ENCOUNTER_CARD_TEXTURE_KEY,
  RUN_LEG_STATUS_TEXTURE_KEY,
} from "./runChrome";
import { ENTRANT_CARD_TEXTURE_KEY, registerEntrantChromeTextureFrames } from "./entrantChrome";

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

    // Feature 031: every runtime asset loads through the shared base-aware
    // boundary so the game works at `/` and beneath the Pages prefix.
    this.load.image("title-race", runtimeAssetUrl("assets/title-race.svg"));
    this.load.image("championship-paddock", runtimeAssetUrl("assets/championship-paddock.svg"));
    this.load.image("workshop", runtimeAssetUrl("assets/workshop.svg"));
    this.load.image("race-day", runtimeAssetUrl("assets/race-day.svg"));
    this.load.image("player-vehicle", runtimeAssetUrl("assets/player-vehicle.svg"));
    this.load.image("rival-vehicle", runtimeAssetUrl("assets/rival-vehicle.svg"));
    this.load.image(UI_CHROME_MASTER_TEXTURE_KEY, runtimeAssetUrl("assets/ui/feature-032-controls-sheet.png"));
    this.load.image(RUN_LEG_STATUS_TEXTURE_KEY, runtimeAssetUrl("assets/ui/feature-032-leg-status-sheet-v2.png"));
    this.load.image(RUN_ENCOUNTER_CARD_TEXTURE_KEY, runtimeAssetUrl("assets/ui/feature-032-encounter-card-sheet-v2.png"));
    this.load.image(ENTRANT_CARD_TEXTURE_KEY, runtimeAssetUrl("assets/ui/feature-032-entrant-card-sheet-v2.png"));

    // Feature 026 production-intent environment masters. They remain local so
    // the complete presentation works offline.
    this.load.image("scene-race-start", runtimeAssetUrl("assets/backgrounds/scenes/championship-race-start.png"));
    this.load.image("scene-route-headquarters", runtimeAssetUrl("assets/backgrounds/scenes/championship-route-headquarters.png"));
    this.load.image("scene-sponsor-negotiation", runtimeAssetUrl("assets/backgrounds/scenes/sponsor-negotiation.png"));
    this.load.image("scene-road-circuit", runtimeAssetUrl("assets/backgrounds/scenes/road-circuit.png"));
    this.load.image("scene-finish-line", runtimeAssetUrl("assets/backgrounds/scenes/finish-line-aftermath.png"));
    this.load.image("scene-pre-race-setup", runtimeAssetUrl("assets/backgrounds/scenes/pre-race-setup.png"));
    this.load.image("region-british-isles", runtimeAssetUrl("assets/backgrounds/regions/british-isles.png"));
    this.load.image("region-continental-europe", runtimeAssetUrl("assets/backgrounds/regions/continental-europe.png"));
    this.load.image("region-north-america", runtimeAssetUrl("assets/backgrounds/regions/north-america.png"));
    this.load.image("region-south-america", runtimeAssetUrl("assets/backgrounds/regions/south-america.png"));
    this.load.image("region-northern-europe", runtimeAssetUrl("assets/backgrounds/regions/northern-europe.png"));
    this.load.image("region-mediterranean-north-africa", runtimeAssetUrl("assets/backgrounds/regions/mediterranean-north-africa.png"));
    this.load.image("region-paris-exhibition", runtimeAssetUrl("assets/backgrounds/regions/paris-exhibition.png"));

    const entrants = ["evelyn-mercer", "lucien-soto", "inez-rook", "nell-voss"] as const;
    entrants.forEach((id) => {
      const silhouette = {
        "evelyn-mercer": "highwheel",
        "lucien-soto": "needle",
        "inez-rook": "lark",
        "nell-voss": "hush",
      }[id];
      this.load.image(`garage-${id}`, runtimeAssetUrl(`assets/backgrounds/garages/${id}-${silhouette}.png`));
    });

    // Production portraits and named-vehicle cutouts replace the feature 010
    // SVG placeholders while preserving their stable texture keys.
    entrants.forEach((id) => {
      this.load.image(`entrant-${id}`, runtimeAssetUrl(`assets/portraits/generated/${id}.png`));
    });
    (["the-highwheel", "the-needle", "the-lark", "the-hush"] as const).forEach((id) => {
      this.load.image(`vehicle-${id}`, runtimeAssetUrl(`assets/vehicles/generated/${id}.png`));
    });

    (["coachworks", "velodrome", "fieldworks", "backroads"] as const).forEach((origin) => {
      (["power", "chassis"] as const).forEach((category) => {
        this.load.image(`item-family-${origin}-${category}`, runtimeAssetUrl(`assets/items/families/${origin}-${category}.png`));
      });
    });
  }

  create(): void {
    registerUIChromeTextureFrames(this);
    registerRunChromeTextureFrames(this);
    registerEntrantChromeTextureFrames(this);
    this.scene.start("TitleScene");
  }
}
