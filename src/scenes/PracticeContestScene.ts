import Phaser from "phaser";
import type { Run } from "../simulation/run";
import {
  cancelPracticeSession,
  practiceReturnData,
  type PracticeSession,
} from "../simulation/practice";
import { clearPracticeRecovery } from "../simulation/practiceRecovery";
import {
  createPlaybackController,
  advancePlaybackController,
  selectPlaybackControllerSpeed,
  skipPlaybackController,
  twoCarBoundaryView,
  playbackSpeedDescriptor,
  frameStateAt,
  type PlaybackController,
  type PlaybackSpeed,
} from "../simulation/playback";
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
import {
  freshPlaybackControlPlan,
  selectPlaybackControl,
  type PlaybackControlPlan,
} from "./playbackControlPresentation";
import { createItemCard, createItemInspector } from "./itemVisuals";
import { resolvedItemEvidence, unresolvedPhysicalEvidence } from "./itemPresentation";
import type { OfferedItem } from "../simulation/types";
import { configureHiDpiScene, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./layout";
import { createAudioState, emitCue, isBrowserAudioMuted, setAudioMuted, setBrowserAudioMuted, startBrowserEngine, startEngine, stopBrowserEngine, stopEngine, unlockAudio, unlockBrowserAudio, type AudioState } from "./audioPresentation";
import { recordedLapVehicleStatModel } from "./vehicleStatPresentation";
import { createVehicleStatPanel } from "./vehicleStatVisuals";

export interface PracticeContestSceneData {
  run?: Run;
  session?: PracticeSession;
}

export class PracticeContestScene extends Phaser.Scene {
  private run?: Run;
  private session?: PracticeSession;
  private playbackController?: PlaybackController;
  private controlPlan: PlaybackControlPlan = freshPlaybackControlPlan();
  private controlButtons = new Map<PlaybackSpeed, Phaser.GameObjects.Text>();
  private paused = false;
  private lastLap = -1;
  private statusText?: Phaser.GameObjects.Text;
  private lapText?: Phaser.GameObjects.Text;
  private evidenceText?: Phaser.GameObjects.Text;
  private focusRing?: PracticeFocusHandle;
  private selectedItem?: { item: OfferedItem; tier: 1 | 2 | 3 };
  private itemInspector?: Phaser.GameObjects.Container;
  private audioState: AudioState = createAudioState();
  private readonly handleVisibility = (): void => {
    if (document.hidden) {
      this.audioState = stopEngine(this.audioState);
      stopBrowserEngine();
    }
  };

  constructor() {
    super("PracticeContestScene");
  }

  create(data: PracticeContestSceneData = {}): void {
    configureHiDpiScene(this);
    if (!data.run || !data.session?.result) {
      this.scene.start("TestDayScene");
      return;
    }
    this.run = data.run;
    this.session = data.session;
    // Feature 033: fresh legacy-rate 1× clock per race; 2× remains selectable.
    // Guard above proves data.session.result exists; the class-field mutation
    // defeats TS narrowing, so the non-null assertion mirrors render()'s usage.
    const result = this.session!.result!;
    const boundaryView = twoCarBoundaryView(result.playback, result.contest);
    this.playbackController = createPlaybackController(boundaryView);
    this.controlPlan = freshPlaybackControlPlan();
    this.audioState = setAudioMuted(this.audioState, isBrowserAudioMuted());
    this.render();
    const mute = this.add.text(LOGICAL_WIDTH - 42, 22, isBrowserAudioMuted() ? "SOUND OFF" : "SOUND ON", {
      fontSize: "10px", fontFamily: UI_FONT, fontStyle: "bold", color: "#9eb5c9",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(95);
    mute.on("pointerdown", () => {
      const muted = !isBrowserAudioMuted();
      setBrowserAudioMuted(muted);
      this.audioState = setAudioMuted(this.audioState, muted);
      mute.setText(muted ? "SOUND OFF" : "SOUND ON");
    });
    this.input.once("pointerdown", () => {
      unlockBrowserAudio();
      this.audioState = unlockAudio(this.audioState);
      const speed = this.playbackController?.clock.speed ?? "normal";
      this.audioState = startEngine(this.audioState, speed);
      startBrowserEngine(speed);
    });
    this.input.keyboard?.on("keydown-SPACE", this.togglePause, this);
    // 030-race-playback-controls (T040): keys 1/2 replace the legacy F cycle.
    this.input.keyboard?.on("keydown-ONE", this.selectNormalSpeed, this);
    this.input.keyboard?.on("keydown-TWO", this.selectFastSpeed, this);
    this.input.keyboard?.on("keydown-S", this.skip, this);
    this.input.keyboard?.on("keydown-ESC", this.cancel, this);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audioState = stopEngine(this.audioState);
      stopBrowserEngine();
      this.input.keyboard?.off("keydown-SPACE", this.togglePause, this);
      document.removeEventListener("visibilitychange", this.handleVisibility);
      this.input.keyboard?.off("keydown-ONE", this.selectNormalSpeed, this);
      this.input.keyboard?.off("keydown-TWO", this.selectFastSpeed, this);
      this.input.keyboard?.off("keydown-S", this.skip, this);
      this.input.keyboard?.off("keydown-ESC", this.cancel, this);
      this.focusRing?.destroy();
      this.controlButtons.forEach((button) => button.destroy());
      this.controlButtons.clear();
    });
  }

  update(_time: number, delta: number): void {
    const result = this.session?.result;
    if (!result || !this.playbackController || this.paused) return;
    // 030-race-playback-controls (T020): advance through the clock; schedule
    // time is the controller's, not raw accumulation.
    this.playbackController = advancePlaybackController(this.playbackController, delta / 1000);
    const scheduleTime = this.playbackController.clock.scheduleTimeSeconds;
    const frame = frameStateAt(result.playback, result.contest, scheduleTime, this.lastLap);
    const previousLap = this.lastLap;
    const crossedPlayerLaps = this.playbackController.lastEvents
      .filter((event) => event.kind === "player-lap" && event.lap !== undefined)
      .map((event) => event.lap! - 1);
    this.lastLap = crossedPlayerLaps.length > 0
      ? crossedPlayerLaps[crossedPlayerLaps.length - 1]
      : Math.max(this.lastLap, frame.player.lapIndex);
    const lapChanged = previousLap !== this.lastLap;
    const visibleLap = Math.min(frame.player.lapIndex + 1, result.contest.lapCount);
    this.lapText?.setText(`Lap ${visibleLap}/${result.contest.lapCount} · live gap ${signed(frame.liveGap)}s`);
    const model = practiceEvidenceModel(result.contest, result.reconciliation);
    const lap = model.laps[Math.min(frame.player.lapIndex, model.laps.length - 1)];
    const contributions = model.contributions.filter((entry) => entry.lap === lap?.lap);
    this.evidenceText?.setText(lap
      ? `Player ${lap.playerTime.toFixed(2)}s · Rival ${lap.rivalTime.toFixed(2)}s\n${evidenceSummary(contributions)}`
      : "Awaiting lap evidence");
    if (lapChanged && this.selectedItem) this.showItem(this.selectedItem.item, this.selectedItem.tier, visibleLap);
    // 030-race-playback-controls (T020): the controller is the single
    // results-ready authority (contract §5).
    if (this.playbackController.resultsReady) this.finish();
  }

  private render(): void {
    const width = LOGICAL_WIDTH;
    const height = LOGICAL_HEIGHT;
    addDemoBackdrop(this, "race-day", 0.72);
    this.add.text(width / 2, 38, "TEST DAY", {
      fontFamily: DISPLAY_FONT,
      fontSize: "28px",
      fontStyle: "bold",
      color: "#f1eee5",
    }).setOrigin(0.5);
    this.add.text(width / 2, 72, "UNSCORED · deterministic playback", {
      fontFamily: UI_FONT,
      fontSize: "16px",
      color: "#d9483f",
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
    // Test Day's legacy resolveContest() carries no track-aware physics
    // evidence today (research.md Decision 7) — honestly report that ceiling
    // rather than showing stock/stale values (FR-019), using the same
    // model/renderer real races use once evidence exists.
    const statModel = recordedLapVehicleStatModel({ lap: 1, lapCount: this.session!.result!.contest.lapCount, contextKind: "test-day" });
    createVehicleStatPanel(this, width / 2, 250, statModel, {
      viewport: { width: Math.min(680, width - 56), height: 60 },
    }).setDepth(20);
    const held = [
      ...this.session!.snapshot.build.slots.flatMap((slot) => slot.item ? [{ item: slot.item, tier: slot.tier }] : []),
      ...this.session!.snapshot.build.storage.flatMap((position) => position.item ? [{ item: position.item, tier: position.tier }] : []),
    ];
    const spacing = Math.min(106, (width - 40) / Math.max(1, held.length));
    const startX = width / 2 - spacing * (held.length - 1) / 2;
    held.forEach(({ item, tier }, index) => {
      const card = createItemCard(this, startX + index * spacing, 290, item, {
        width: Math.min(100, spacing - 4), height: 58, iconSize: 18,
        context: { surface: "test-day-lap", tier },
      }).setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => {
        this.selectedItem = { item, tier };
        this.showItem(item, tier, Math.max(1, this.lastLap + 1));
      });
    });
    this.statusText = this.add.text(width / 2, height - 116, "PLAYING · 1×", {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#9eb5c9",
    }).setOrigin(0.5);
    // 030-race-playback-controls (T039): retain Cancel/Pause/Skip/focus
    // while adding direct selected 1×/2× controls within 800×450.
    const plan = practiceContestControlPlan();
    const practiceButtons = [
      createDemoButton(this, width / 2 - 140, height - 66, plan[0].label, () => this.cancel(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE }),
      createDemoButton(this, width / 2, height - 66, plan[1].label, () => this.togglePause(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE, repeatable: true }),
      createDemoButton(this, width / 2 + 140, height - 66, plan[2].label, () => this.skip(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE }),
    ];
    this.controlPlan = freshPlaybackControlPlan();
    const speedButtons = this.controlPlan.controls.map((control, index) => {
      const x = width / 2 + (index === 0 ? -50 : 50);
      const label = `${control.selectedMarker} ${control.label}`;
      const button = this.add
        .text(x, height - 30, label, {
          fontSize: PRACTICE_CONTROL_FONT_SIZE,
          fontFamily: UI_FONT,
          fontStyle: "bold",
          color: control.selected ? "#ffd447" : "#9eb5c9",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(90);
      button.on("pointerdown", () => this.selectSpeed(control.speed));
      this.controlButtons.set(control.speed, button);
      return button;
    });
    this.focusRing = applyPracticeFocusRing(this, [...practiceButtons, ...speedButtons]);
  }

  private showItem(item: OfferedItem, tier: 1 | 2 | 3, lap: number): void {
    this.itemInspector?.destroy();
    const legacy = this.session!.result!.contest.contributions?.find((entry) => entry.sourceItemId === item.id && entry.lap === lap);
    const lapEvidence = item.physics || item.conditionalPhysics?.length
      ? unresolvedPhysicalEvidence(item, lap, tier)
      : legacy ? resolvedItemEvidence(item, { kind: "legacy-time", evidence: legacy }) : undefined;
    this.itemInspector = createItemInspector(this, LOGICAL_WIDTH / 2, 218, item, {
      surface: "test-day-lap", tier, lapEvidence,
    }, { width: LOGICAL_WIDTH - 48, height: 112 }).setDepth(80);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.audioState = stopEngine(this.audioState);
      stopBrowserEngine();
    } else if (this.playbackController) {
      this.audioState = startEngine(this.audioState, this.playbackController.clock.speed);
      startBrowserEngine(this.playbackController.clock.speed);
    }
    this.updateStatusText();
  }

  /**
   * 030-race-playback-controls (T027): direct idempotent normal/fast
   * selection that changes the clock rate without changing elapsed schedule
   * time (contract §3).
   */
  private selectSpeed(speed: PlaybackSpeed): void {
    if (!this.playbackController) return;
    this.playbackController = selectPlaybackControllerSpeed(this.playbackController, speed);
    this.audioState = startEngine(this.audioState, speed);
    startBrowserEngine(speed);
    this.audioState = emitCue(this.audioState, "ui-select");
    this.controlPlan = selectPlaybackControl(this.controlPlan, speed);
    this.updateStatusText();
    this.controlPlan.controls.forEach((control) => {
      const button = this.controlButtons.get(control.speed);
      if (button) {
        button.setText(`${control.selectedMarker} ${control.label}`);
        button.setColor(control.selected ? "#ffd447" : "#9eb5c9");
      }
    });
  }

  private selectNormalSpeed(): void {
    this.selectSpeed("normal");
  }

  private selectFastSpeed(): void {
    this.selectSpeed("fast");
  }

  private skip(): void {
    if (!this.playbackController) return;
    // 030-race-playback-controls (T019): Skip targets the finite finish
    // boundary, never Infinity (contract §7).
    this.playbackController = skipPlaybackController(this.playbackController);
    this.audioState = stopEngine(this.audioState);
    stopBrowserEngine();
    if (this.playbackController.resultsReady) this.finish();
  }

  private updateStatusText(): void {
    const speed = this.playbackController
      ? playbackSpeedDescriptor(this.playbackController.clock.speed).label
      : "2×";
    this.statusText?.setText(`${this.paused ? "PAUSED" : "PLAYING"} · ${speed}`);
  }

  private finish(): void {
    this.audioState = stopEngine(this.audioState);
    stopBrowserEngine();
    const session = this.session;
    this.session = undefined;
    this.playbackController = undefined;
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
