import Phaser from "phaser";
import type { Run } from "../simulation/run";
import {
  TEST_DAY_CONFIG,
  createPracticeSession,
  latestPracticeComparison,
  practiceReturnData,
  resolvePractice,
  type PracticeSession,
} from "../simulation/practice";
import { clearPracticeRecovery, writePracticeRecovery } from "../simulation/practiceRecovery";
import {
  addDemoBackdrop,
  applyPracticeFocusRing,
  createDemoButton,
  DISPLAY_FONT,
  PRACTICE_CONTROL_FONT_SIZE,
  UI_FONT,
  type PracticeFocusHandle,
} from "./demoTheme";
import { practiceComparisonModel, practiceEvidenceModel, practiceResultControlPlan } from "./practicePresentation";

export interface PracticeResultSceneData {
  run?: Run;
  session?: PracticeSession;
}

export class PracticeResultScene extends Phaser.Scene {
  private run?: Run;
  private session?: PracticeSession;
  private focusRing?: PracticeFocusHandle;

  constructor() {
    super("PracticeResultScene");
  }

  create(data: PracticeResultSceneData = {}): void {
    if (!data.run || !data.session?.result) {
      this.scene.start("TestDayScene");
      return;
    }
    this.run = data.run;
    this.session = data.session;
    this.render();
    this.input.keyboard?.on("keydown-ENTER", () => this.returnToPreparation());
    this.input.keyboard?.on("keydown-R", () => this.repeat());
    this.input.keyboard?.on("keydown-ESC", () => this.returnToPreparation());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.focusRing?.destroy());
  }

  private render(): void {
    const result = this.session!.result!;
    const model = practiceEvidenceModel(result.contest, result.reconciliation);
    const { width, height } = this.scale;
    addDemoBackdrop(this, "race-day", 0.8);
    this.add.text(width / 2, 38, "TEST DAY · UNSCORED", {
      fontFamily: DISPLAY_FONT,
      fontSize: "28px",
      fontStyle: "bold",
      color: "#f3e5bd",
    }).setOrigin(0.5);
    this.add.text(width / 2, 82, model.outcome.toUpperCase(), {
      fontFamily: DISPLAY_FONT,
      fontSize: "30px",
      color: "#ffd166",
    }).setOrigin(0.5);
    this.add.text(width / 2, 130,
      `Player ${model.playerTotal.label} · Rival ${model.rivalTotal.label} · Gap ${model.gap.label}`, {
        fontFamily: UI_FONT,
        fontSize: "17px",
        color: "#ffffff",
        align: "center",
      }).setOrigin(0.5);
    const rows = model.laps.map((lap) =>
      `${lap.label} · ${model.contributions.filter((entry) => entry.lap === lap.lap).map((entry) => `${entry.itemName} ${entry.state} ${signed(entry.contribution)}s`).join(", ") || "no item contribution"}`
    );
    this.add.text(24, 170, rows.join("\n"), {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#d7e1e6",
      lineSpacing: 4,
      wordWrap: { width: width - 48 },
    });
    this.add.text(width / 2, height - 168,
      `${model.reconciliation} · no purse · no sponsor · no progression`, {
        fontFamily: UI_FONT,
        fontSize: "14px",
        color: model.reconciliation === "RECONCILED" ? "#9fd3b2" : "#e6c1bd",
      }).setOrigin(0.5);
    this.renderComparison(width, height);
    const plan = practiceResultControlPlan();
    const returnControl = plan.find((entry) => entry.id === "return")!;
    const repeatControl = plan.find((entry) => entry.id === "repeat-test")!;
    const repeatButton = createDemoButton(this, width / 2 - 120, height - 62, repeatControl.label, () => this.repeat(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    const returnButton = createDemoButton(this, width / 2 + 120, height - 62, returnControl.label, () => this.returnToPreparation(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    this.focusRing = applyPracticeFocusRing(this, [repeatButton, returnButton]);
  }

  private renderComparison(width: number, height: number): void {
    const comparison = latestPracticeComparison(this.run ?? null);
    if (!comparison) {
      this.add.text(width / 2, height - 136, "No previous test to compare in this run yet", {
        fontFamily: UI_FONT,
        fontSize: "14px",
        color: "#9aa7ad",
      }).setOrigin(0.5);
      return;
    }
    const comparisonModel = practiceComparisonModel(comparison);
    const buildChangeSummary = comparisonModel.buildChanges.length > 0
      ? comparisonModel.buildChanges.map((change) => change.label).join(" · ")
      : "No build changes since previous test";
    this.add.text(width / 2, height - 136,
      `VS PREVIOUS TEST · ${comparisonModel.direction} · total ${comparisonModel.totalDeltaLabel} · gap ${comparisonModel.gapDeltaLabel} · ${comparisonModel.outcomeLabel}`, {
        fontFamily: UI_FONT,
        fontSize: "14px",
        color: comparisonModel.direction === "IMPROVED"
          ? "#9fd3b2"
          : comparisonModel.direction === "WORSENED" ? "#e6c1bd" : "#d7e1e6",
      }).setOrigin(0.5);
    this.add.text(width / 2, height - 116, buildChangeSummary, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#b9c4ca",
      align: "center",
      wordWrap: { width: width - 48 },
    }).setOrigin(0.5, 0);
  }

  private repeat(): void {
    if (!this.run || !this.session) return;
    const next = resolvePractice(createPracticeSession(
      this.run,
      this.session.returnContext as Parameters<typeof createPracticeSession>[1],
    ));
    if (next.state === "completed") {
      writePracticeRecovery({
        runId: this.run.id,
        run: this.run,
        returnContext: next.returnContext as Parameters<typeof writePracticeRecovery>[0]["returnContext"],
        snapshot: next.snapshot,
        config: TEST_DAY_CONFIG as Parameters<typeof writePracticeRecovery>[0]["config"],
      });
    }
    this.scene.start("PracticeContestScene", { run: this.run, session: next });
  }

  private returnToPreparation(): void {
    if (!this.run || !this.session) return;
    clearPracticeRecovery();
    const returned = practiceReturnData(this.run, this.session);
    this.scene.start(returned.route, returned);
  }
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}