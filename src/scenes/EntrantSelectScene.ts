import Phaser from "phaser";
import { createRunForEntrant, type Run } from "../simulation/run";
import type { EntrantId } from "../simulation/types";
import {
  entrantSelectionModel,
  type EntrantChoiceModel,
  type EntrantSelectionModel,
} from "./entrantPresentation";
import {
  addDemoBackdrop,
  addPaperPanel,
  applyPracticeFocusRing,
  createDemoButton,
  DEMO_COLORS,
  DISPLAY_FONT,
  PRACTICE_CONTROL_FONT_SIZE,
  UI_FONT,
  type PracticeFocusHandle,
} from "./demoTheme";

export interface EntrantSelectSceneData {
  /** Present only when the caller's guard already blocked selection. */
  unavailableReason?: string;
}

// Explicit vertical budget for the 800x450 canvas so nothing overlaps:
// title 20 | equality 40-76 | cards 88-228 | select 246 | detail 268-396 | actions 424
const CARD_WIDTH = 182;
const CARD_HEIGHT = 146;
const CARD_GAP = 10;
const CARD_TOP = 82;
const SELECT_Y = CARD_TOP + CARD_HEIGHT + 16;
// Sized for the tallest detail: a 2-line heading plus 4 body lines (The Hush
// adds a no-Flex disclosure the other three vehicles do not have).
const DETAIL_TOP = 266;
const DETAIL_HEIGHT = 134;
const ACTION_Y = 428;

export class EntrantSelectScene extends Phaser.Scene {
  private selectedEntrantId: EntrantId | null = null;
  private unavailableReason?: string;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private focusRing?: PracticeFocusHandle;

  constructor() {
    super("EntrantSelectScene");
  }

  create(data: EntrantSelectSceneData = {}): void {
    // Selection is deliberately stateless until confirmation: no run, no RNG,
    // no credits, no offers exist while the player browses (spec US1 #5).
    this.selectedEntrantId = null;
    this.unavailableReason = data.unavailableReason;
    addDemoBackdrop(this, "championship-paddock", 0.78);
    this.render();

    this.input.keyboard?.on("keydown-ESC", () => this.cancel());
    this.input.keyboard?.on("keydown-ENTER", () => this.confirm());
    (["ONE", "TWO", "THREE", "FOUR"] as const).forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.selectByIndex(index));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.focusRing?.destroy());
  }

  private model(): EntrantSelectionModel {
    return entrantSelectionModel(
      this.selectedEntrantId,
      this.unavailableReason ? { blocked: true, reason: this.unavailableReason } : { blocked: false },
    );
  }

  private selectByIndex(index: number): void {
    const choice = this.model().choices[index];
    if (choice) this.select(choice.entrantId);
  }

  private select(entrantId: EntrantId): void {
    this.selectedEntrantId = entrantId;
    this.render();
  }

  private render(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    this.focusRing?.destroy();

    const model = this.model();
    const { width, height } = this.scale;

    this.track(this.add.text(width / 2, 18, model.title, {
      fontFamily: DISPLAY_FONT,
      fontSize: "22px",
      fontStyle: "bold",
      color: "#f3e5bd",
    }).setOrigin(0.5, 0));

    if (model.unavailable) {
      this.renderUnavailable(model.unavailable.reason, width, height);
      return;
    }

    this.track(this.add.text(width / 2, 44, model.equalityStatement, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#cddbd2",
      align: "center",
      lineSpacing: 2,
      wordWrap: { width: Math.min(700, width - 40) },
    }).setOrigin(0.5, 0));

    const buttons = model.choices.map((choice) => this.renderChoice(choice, width));
    this.renderDetail(model, width);

    const confirmButton = createDemoButton(
      this,
      width / 2 + 130,
      ACTION_Y,
      model.confirm.label,
      () => this.confirm(),
      model.confirm.enabled,
      { fontSize: PRACTICE_CONTROL_FONT_SIZE },
    );
    this.track(confirmButton);
    const backButton = createDemoButton(
      this,
      width / 2 - 130,
      ACTION_Y,
      "BACK",
      () => this.cancel(),
      true,
      { fontSize: PRACTICE_CONTROL_FONT_SIZE },
    );
    this.track(backButton);

    this.focusRing = applyPracticeFocusRing(this, [...buttons, backButton, confirmButton]);
  }

  private renderChoice(choice: EntrantChoiceModel, width: number): Phaser.GameObjects.Text {
    const totalWidth = 4 * CARD_WIDTH + 3 * CARD_GAP;
    const startX = (width - totalWidth) / 2 + CARD_WIDTH / 2;
    const x = startX + choice.order * (CARD_WIDTH + CARD_GAP);
    const centerY = CARD_TOP + CARD_HEIGHT / 2;

    this.track(this.add.rectangle(x, centerY, CARD_WIDTH, CARD_HEIGHT,
      choice.selected ? 0x2c4640 : 0x1b2427, 0.94)
      .setStrokeStyle(choice.selected ? 3 : 2,
        choice.selected ? DEMO_COLORS.brass : DEMO_COLORS.steel, choice.selected ? 1 : 0.5));

    // Text state token first, so selection never depends on border colour alone.
    this.track(this.add.text(x, CARD_TOP + 5, `${choice.keyBinding} · ${choice.stateLabel}`, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      fontStyle: "bold",
      color: choice.selected ? "#ffd166" : "#8fa0a8",
    }).setOrigin(0.5, 0));
    this.track(this.add.image(x, CARD_TOP + 36, choice.portraitAssetKey).setDisplaySize(34, 34));
    this.track(this.add.text(x, CARD_TOP + 55, choice.name, {
      fontFamily: DISPLAY_FONT,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#f3e5bd",
    }).setOrigin(0.5, 0));
    this.track(this.add.text(x, CARD_TOP + 74, choice.vehicleName, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#e0d3ab",
    }).setOrigin(0.5, 0));
    this.track(this.add.text(x, CARD_TOP + 91, choice.originLabel, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#c6d3cb",
    }).setOrigin(0.5, 0));
    this.track(this.add.text(x, CARD_TOP + 108, choice.topologyLabel, {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#9eb5c9",
      align: "center",
      lineSpacing: 2,
      // Wrap inside the card rather than bleeding past its border.
      wordWrap: { width: CARD_WIDTH - 20 },
    }).setOrigin(0.5, 0));

    const button = createDemoButton(this, x, SELECT_Y, choice.selected ? "SELECTED" : "SELECT",
      () => this.select(choice.entrantId), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE, repeatable: true });
    this.track(button);
    return button;
  }

  private renderDetail(model: EntrantSelectionModel, width: number): void {
    const detail = model.detail;
    const panelWidth = Math.min(748, width - 28);
    const centerY = DETAIL_TOP + DETAIL_HEIGHT / 2;
    this.track(addPaperPanel(this, width / 2, centerY, panelWidth, DETAIL_HEIGHT, 0.9));

    if (!detail) {
      const prompt = model.confirm.disabledReason
        ?? "Select an entrant to read their approach, ecosystem, and vehicle.";
      this.track(this.add.text(width / 2, centerY, prompt, {
        fontFamily: UI_FONT,
        fontSize: "14px",
        color: "#9aa7ad",
        align: "center",
      }).setOrigin(0.5));
      return;
    }

    const left = width / 2 - panelWidth / 2;
    this.track(this.add.image(left + 66, centerY, detail.silhouetteAssetKey).setDisplaySize(112, 56));

    const textLeft = left + 136;
    const textWidth = panelWidth - 152;
    this.track(this.add.text(textLeft, DETAIL_TOP + 6, `${detail.name} — ${detail.role}`, {
      fontFamily: DISPLAY_FONT,
      fontSize: "15px",
      fontStyle: "bold",
      color: "#f3e5bd",
      wordWrap: { width: textWidth },
    }));
    const lines = [
      `${detail.vehicleName} · ${detail.topologyLabel} · ${detail.storageCapacity} storage`,
      detail.originWeightingNote,
      ...(detail.noFlexDisclosure ? [detail.noFlexDisclosure] : []),
    ];
    this.track(this.add.text(textLeft, DETAIL_TOP + 46, lines.join("\n"), {
      fontFamily: UI_FONT,
      fontSize: "14px",
      color: "#dbe4de",
      lineSpacing: 3,
      wordWrap: { width: textWidth },
    }));
  }

  private renderUnavailable(reason: string, width: number, height: number): void {
    this.track(this.add.text(width / 2, height / 2 - 20, "ENTRANT SELECTION · UNAVAILABLE", {
      fontFamily: DISPLAY_FONT,
      fontSize: "22px",
      color: "#f3e5bd",
    }).setOrigin(0.5));
    this.track(this.add.text(width / 2, height / 2 + 14, reason, {
      fontFamily: UI_FONT,
      fontSize: "16px",
      color: "#e6c1bd",
      align: "center",
      wordWrap: { width: Math.min(620, width - 48) },
    }).setOrigin(0.5));
    const back = createDemoButton(this, width / 2, height / 2 + 70, "BACK", () => this.cancel(), true, {
      fontSize: PRACTICE_CONTROL_FONT_SIZE,
    });
    this.track(back);
    this.focusRing = applyPracticeFocusRing(this, [back]);
  }

  private confirm(): void {
    const model = this.model();
    if (!model.confirm.enabled || !this.selectedEntrantId) return;

    const result = createRunForEntrant({
      entrantId: this.selectedEntrantId,
      runId: `run-${Date.now()}`,
      seed: Date.now(),
      rng: Math.random,
    });

    if (result.kind === "validation-failure") {
      this.unavailableReason = `This entrant could not be started (${result.code}).`;
      this.render();
      return;
    }

    const run: Run = result.run;
    this.scene.start("RunScene", { run });
  }

  private cancel(): void {
    this.scene.start("TitleScene");
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}
