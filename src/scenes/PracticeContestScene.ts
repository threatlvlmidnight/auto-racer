import Phaser from "phaser";
import type { Run } from "../simulation/run";
import {
  cancelPracticeSession,
  practiceReturnData,
  type PracticeSession,
} from "../simulation/practice";
import { clearPracticeRecovery } from "../simulation/practiceRecovery";
import { frameStateAt } from "../simulation/playback";
import {
  addDemoBackdrop,
  applyPracticeFocusRing,
  createDemoButton,
  DISPLAY_FONT,
  PRACTICE_CONTROL_FONT_SIZE,
  UI_FONT,
  type PracticeFocusHandle,
} from "./demoTheme";
import { practiceContestControlPlan, practiceEvidenceModel } from "./practicePresentation";

export interface PracticeContestSceneData {
  run?: Run;
  session?: PracticeSession;
}

export class PracticeContestScene extends Phaser.Scene {
  private run?: Run;
  private session?: PracticeSession;
  private elapsedSeconds = 0;
  private speed = 1;
  private paused = false;
  private lastLap = -1;
  private statusText?: Phaser.GameObjects.Text;
  private lapText?: Phaser.GameObjects.Text;
  private evidenceText?: Phaser.GameObjects.Text;
  private focusRing?: PracticeFocusHandle;

  constructor() {
    super("PracticeContestScene");
  }

  create(data: PracticeContestSceneData = {}): void {
    if (!data.run || !data.session?.result) {
      this.scene.start("TestDayScene");
      return;
    }
    this.run = data.run;
    this.session = data.session;
    this.render();
    this.input.keyboard?.on("keydown-SPACE", () => this.togglePause());
    this.input.keyboard?.on("keydown-F", () => this.changeSpeed());
    this.input.keyboard?.on("keydown-S", () => this.skip());
    this.input.keyboard?.on("keydown-ESC", () => this.cancel());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.focusRing?.destroy());
  }

  update(_time: number, delta: number): void {
    const result = this.session?.result;
    if (!result || this.paused) return;
    this.elapsedSeconds += delta / 1000 * this.speed;
    const frame = frameStateAt(result.playback, result.contest, this.elapsedSeconds, this.lastLap);
    this.lastLap = frame.player.lapIndex;
    const visibleLap = Math.min(frame.player.lapIndex + 1, result.contest.lapCount);
    this.lapText?.setText(`Lap ${visibleLap}/${result.contest.lapCount} · live gap ${signed(frame.liveGap)}s`);
    const model = practiceEvidenceModel(result.contest, result.reconciliation);
    const lap = model.laps[Math.min(frame.player.lapIndex, model.laps.length - 1)];
    const contributions = model.contributions.filter((entry) => entry.lap === lap?.lap);
    this.evidenceText?.setText(lap
      ? `Player ${lap.playerTime.toFixed(2)}s · Rival ${lap.rivalTime.toFixed(2)}s\n${evidenceSummary(contributions)}`
      : "Awaiting lap evidence");
    if (frame.player.finished && frame.ghost.finished) this.finish();
  }

  private render(): void {
    const { width, height } = this.scale;
    addDemoBackdrop(this, "race-day", 0.72);
    this.add.text(width / 2, 38, "TEST DAY", {
      fontFamily: DISPLAY_FONT,
      fontSize: "28px",
      fontStyle: "bold",
      color: "#f3e5bd",
    }).setOrigin(0.5);
    this.add.text(width / 2, 72, "UNSCORED · deterministic playback", {
      fontFamily: UI_FONT,
      fontSize: "16px",
      color: "#ffd166",
    }).setOrigin(0.5);
    this.lapText = this.add.text(width / 2, 126, "Lap 1/10 · live gap +0.00s", {
      fontFamily: UI_FONT,
      fontSize: "18px",
      color: "#ffffff",
    }).setOrigin(0.5);
    this.evidenceText = this.add.text(width / 2, 205, "Awaiting lap evidence", {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#d7e1e6",
      align: "center",
      wordWrap: { width: Math.min(680, width - 48) },
    }).setOrigin(0.5);
    this.statusText = this.add.text(width / 2, height - 116, "PLAYING · 1x", {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#9eb5c9",
    }).setOrigin(0.5);
    const plan = practiceContestControlPlan();
    const buttons = [
      createDemoButton(this, width / 2 - 210, height - 66, plan[0].label, () => this.cancel(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE }),
      createDemoButton(this, width / 2 - 70, height - 66, plan[1].label, () => this.togglePause(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE, repeatable: true }),
      createDemoButton(this, width / 2 + 70, height - 66, plan[2].label, () => this.changeSpeed(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE, repeatable: true }),
      createDemoButton(this, width / 2 + 210, height - 66, plan[3].label, () => this.skip(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE }),
    ];
    this.focusRing = applyPracticeFocusRing(this, buttons);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.statusText?.setText(`${this.paused ? "PAUSED" : "PLAYING"} · ${this.speed}x`);
  }

  private changeSpeed(): void {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1;
    this.statusText?.setText(`${this.paused ? "PAUSED" : "PLAYING"} · ${this.speed}x`);
  }

  private skip(): void {
    this.elapsedSeconds = Number.POSITIVE_INFINITY;
  }

  private finish(): void {
    const session = this.session;
    this.session = undefined;
    this.scene.start("PracticeResultScene", { run: this.run, session });
  }

  private cancel(): void {
    if (!this.run || !this.session) return;
    clearPracticeRecovery();
    const returned = practiceReturnData(this.run, cancelPracticeSession(this.session));
    this.scene.start(returned.route, returned);
  }
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function evidenceSummary(evidence: ReturnType<typeof practiceEvidenceModel>["contributions"]): string {
  if (evidence.length === 0) return "Empty build · no item contribution";
  return evidence.map((entry) =>
    `${entry.itemName}: ${entry.state} ${signed(entry.contribution)}s`
  ).join(" · ");
}