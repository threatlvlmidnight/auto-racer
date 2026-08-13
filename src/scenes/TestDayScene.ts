import Phaser from "phaser";
import type { Run } from "../simulation/run";
import {
  TEST_DAY_CONFIG,
  cancelPracticeSession,
  createPracticeSession,
  practiceReturnData,
  resolvePractice,
  testDayAvailability,
  type PracticeOriginInput,
  type PracticeSession,
} from "../simulation/practice";
import { clearPracticeRecovery, readPracticeRecovery, writePracticeRecovery } from "../simulation/practiceRecovery";
import {
  addDemoBackdrop,
  addPaperPanel,
  applyPracticeFocusRing,
  createDemoButton,
  DISPLAY_FONT,
  PRACTICE_CONTROL_FONT_SIZE,
  UI_FONT,
  type PracticeFocusHandle,
} from "./demoTheme";
import { PRACTICE_STATE_TOKENS, practiceBriefingControlPlan, practiceBriefingModel } from "./practicePresentation";
import { createItemCard, createItemInspector } from "./itemVisuals";
import { unresolvedPhysicalEvidence } from "./itemPresentation";
import type { OfferedItem } from "../simulation/types";
import { configureHiDpiScene, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./layout";

export interface TestDaySceneData {
  run?: Run;
  origin?: PracticeOriginInput;
}

export class TestDayScene extends Phaser.Scene {
  private run?: Run;
  private session?: PracticeSession;
  private starting = false;
  private focusRing?: PracticeFocusHandle;
  private itemInspector?: Phaser.GameObjects.Container;

  constructor() {
    super("TestDayScene");
  }

  create(data: TestDaySceneData = {}): void {
    configureHiDpiScene(this);
    this.run = data.run;
    const recovery = staleRecoveryFor(data.run ?? null);
    if (recovery) clearPracticeRecovery();
    const availability = testDayAvailability(data.run, data.origin ?? null, { stable: true }, {}, recovery);
    if (!data.run || !availability.available || !availability.returnContext) {
      this.renderUnavailable(availability.reason ?? "Test Day context is unavailable.");
      return;
    }
    this.session = createPracticeSession(data.run, availability.returnContext);
    this.renderBriefing();
    this.input.keyboard?.on("keydown-ESC", () => this.cancel());
    this.input.keyboard?.on("keydown-ENTER", () => this.startTest());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.focusRing?.destroy());
  }

  private renderBriefing(): void {
    const model = practiceBriefingModel(this.session!);
    const width = LOGICAL_WIDTH;
    const height = LOGICAL_HEIGHT;
    addDemoBackdrop(this, "workshop", 0.8);
    addPaperPanel(this, width / 2, height / 2 + 8, Math.min(680, width - 32), Math.min(380, height - 32), 0.94);
    this.add.text(width / 2, 50, model.title, {
      fontFamily: DISPLAY_FONT,
      fontSize: "30px",
      fontStyle: "bold",
      color: "#f1eee5",
    }).setOrigin(0.5);
    this.add.text(width / 2, 84, model.status, {
      fontFamily: UI_FONT,
      fontSize: "18px",
      fontStyle: "bold",
      color: "#d9483f",
    }).setOrigin(0.5);
    [model.rival, model.configuration, model.snapshot].forEach((label, index) => {
      this.add.text(width / 2, 126 + index * 30, label, {
        fontFamily: UI_FONT,
        fontSize: index === 2 ? "14px" : "16px",
        color: "#e6edf0",
        align: "center",
        wordWrap: { width: Math.min(620, width - 56) },
      }).setOrigin(0.5);
    });
    this.add.text(width / 2, 235, model.consequences.join("  ·  "), {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#cddbd2",
      align: "center",
      wordWrap: { width: Math.min(620, width - 56) },
    }).setOrigin(0.5);
    const held = [
      ...this.session!.snapshot.build.slots.flatMap((slot) => slot.item ? [{ item: slot.item, tier: slot.tier }] : []),
      ...this.session!.snapshot.build.storage.flatMap((position) => position.item ? [{ item: position.item, tier: position.tier }] : []),
    ];
    const spacing = Math.min(108, (width - 40) / Math.max(1, held.length));
    const startX = width / 2 - spacing * (held.length - 1) / 2;
    held.forEach(({ item, tier }, index) => {
      const card = createItemCard(this, startX + index * spacing, 300, item, {
        width: Math.min(102, spacing - 4), height: 62, iconSize: 18,
        context: { surface: "test-day-briefing", tier },
      }).setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.showItem(item, tier));
    });
    const plan = practiceBriefingControlPlan({ available: true, reason: null });
    const cancelButton = createDemoButton(this, width / 2 - 105, height - 72, plan[0].label, () => this.cancel(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    const startButton = createDemoButton(this, width / 2 + 105, height - 72, plan[1].label, () => this.startTest(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    this.focusRing = applyPracticeFocusRing(this, [cancelButton, startButton]);
  }

  private showItem(item: OfferedItem, tier: 1 | 2 | 3): void {
    this.itemInspector?.destroy();
    this.itemInspector = createItemInspector(this, LOGICAL_WIDTH / 2, 235, item, {
      surface: "test-day-briefing", tier,
      lapEvidence: unresolvedPhysicalEvidence(item, 1, tier),
    }, { width: LOGICAL_WIDTH - 48, height: 108 }).setDepth(80);
  }

  private renderUnavailable(reason: string): void {
    const width = LOGICAL_WIDTH;
    const height = LOGICAL_HEIGHT;
    addDemoBackdrop(this, "workshop", 0.82);
    this.add.text(width / 2, height / 2 - 42, `TEST DAY · ${PRACTICE_STATE_TOKENS.unavailable.text}`, {
      fontFamily: DISPLAY_FONT,
      fontSize: "26px",
      color: "#f1eee5",
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 8, reason, {
      fontFamily: UI_FONT,
      fontSize: "16px",
      color: "#e6c1bd",
      align: "center",
      wordWrap: { width: Math.min(620, width - 48) },
    }).setOrigin(0.5);
    const returnButton = createDemoButton(this, width / 2, height / 2 + 80, "RETURN", () => {
      if (this.run) this.scene.start("RunScene", { run: this.run });
      else this.scene.start("RunScene", { unavailable: true });
    }, true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    this.focusRing = applyPracticeFocusRing(this, [returnButton]);
  }

  private startTest(): void {
    if (this.starting || !this.run || !this.session) return;
    this.starting = true;
    const session = resolvePractice(this.session);
    if (session.state !== "completed") {
      this.starting = false;
      this.renderUnavailable(session.failure?.message ?? "Test Day could not resolve.");
      return;
    }
    writePracticeRecovery({
      runId: this.run.id,
      run: this.run,
      returnContext: session.returnContext as Parameters<typeof writePracticeRecovery>[0]["returnContext"],
      snapshot: session.snapshot,
      config: TEST_DAY_CONFIG as Parameters<typeof writePracticeRecovery>[0]["config"],
    });
    this.scene.start("PracticeContestScene", { run: this.run, session });
  }

  private cancel(): void {
    if (!this.run || !this.session) return;
    clearPracticeRecovery();
    const returned = practiceReturnData(this.run, cancelPracticeSession(this.session));
    this.scene.start(returned.route, returned);
  }
}

function staleRecoveryFor(run: Run | null): { mismatched: boolean; reason?: string } | null {
  const result = readPracticeRecovery();
  if (!result.ok) return null;
  if (!run || result.payload.runId === run.id) return null;
  return {
    mismatched: true,
    reason: "Saved Test Day recovery data belongs to a different run and no longer applies here.",
  };
}
