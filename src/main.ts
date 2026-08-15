import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { EntrantSelectScene } from "./scenes/EntrantSelectScene";
import { RunScene } from "./scenes/RunScene";
import { PrepareScene } from "./scenes/PrepareScene";
import { ContestScene } from "./scenes/ContestScene";
import { ResultScene } from "./scenes/ResultScene";
import { TestDayScene } from "./scenes/TestDayScene";
import { PracticeContestScene } from "./scenes/PracticeContestScene";
import { PracticeResultScene } from "./scenes/PracticeResultScene";
import { PreRaceScene } from "./scenes/PreRaceScene";
import { DestinationScene } from "./scenes/DestinationScene";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, RENDER_SCALE } from "./scenes/layout";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: LOGICAL_WIDTH * RENDER_SCALE,
  height: LOGICAL_HEIGHT * RENDER_SCALE,
  backgroundColor: "#172426",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    width: LOGICAL_WIDTH * RENDER_SCALE,
    height: LOGICAL_HEIGHT * RENDER_SCALE,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: "high-performance",
  },
  scene: [
    BootScene,
    TitleScene,
    EntrantSelectScene,
    DestinationScene,
    RunScene,
    PrepareScene,
    PreRaceScene,
    ContestScene,
    ResultScene,
    TestDayScene,
    PracticeContestScene,
    PracticeResultScene,
  ],
};

export const game = new Phaser.Game(config);
