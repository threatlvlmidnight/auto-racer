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

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 800,
  height: 450,
  backgroundColor: "#172426",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    TitleScene,
    EntrantSelectScene,
    RunScene,
    PrepareScene,
    ContestScene,
    ResultScene,
    TestDayScene,
    PracticeContestScene,
    PracticeResultScene,
  ],
};

export const game = new Phaser.Game(config);
