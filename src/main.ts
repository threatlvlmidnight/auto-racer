import Phaser from "phaser";
import { PrepareScene } from "./scenes/PrepareScene";
import { ContestScene } from "./scenes/ContestScene";
import { ResultScene } from "./scenes/ResultScene";

// Feature 001-core-loop bootstrap (T014). PrepareScene is first, per FR-002/
// spec.md User Story 1.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 800,
  height: 450,
  backgroundColor: "#1d1d1d",
  scene: [PrepareScene, ContestScene, ResultScene],
};

export const game = new Phaser.Game(config);
