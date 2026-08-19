import Phaser from "phaser";
import type { Run } from "../simulation/run";
import {
  lockRaceSetup,
  raceSetupInput,
  type RaceSetupInput,
} from "../simulation/raceSetup";
import type { PracticeOriginInput, PracticeSetupSnapshot } from "../simulation/practice";
import type { SetupControlFamily, SetupPositionId, SetupSelections } from "../simulation/types";
import {
  raceSetupSceneModel,
  trackPreviewPoints,
  type RaceSetupSceneModel,
  type SetupControlRow,
} from "./raceSetupPresentation";
import {
  addDemoBackdrop,
  addPaperPanel,
  addRunStamp,
  applyPracticeFocusRing,
  createDemoButton,
  DISPLAY_FONT,
  PRACTICE_CONTROL_FONT_SIZE,
  UI_FONT,
  type PracticeFocusHandle,
} from "./demoTheme";
import { configureHiDpiScene, LOGICAL_WIDTH } from "./layout";
import { circuitIdentityLine, circuitPresentationIdentity } from "./circuitPresentation";
import { formatStatPoint, preRaceCaptionMetrics } from "./sceneLayoutBands";
import { createRuntimeTextControl } from "./uiChrome";
import { identityForEntrant } from "../content/driverRaceIdentities";
import { DEFAULT_RACE_ENRICHMENT_CONFIG } from "../simulation/enrichmentConfig";
import { signatureEligibilityFor } from "../simulation/raceEnrichment";
import { resolveCurrentBuildPhysicalStats } from "../simulation/laps";
import { installedItems } from "../simulation/slots";
import { buildIncidentRiskModel, driverBriefing } from "./raceEnrichmentPresentation";

const CONTROL_TOP_Y = 216;
// Tight enough that Driver Aggression plus the natural maximum of four
// distinct installed equipment families (FR-009B) still clears the
// Back/Test-Day/Start-Race row at the bottom of the fixed
// 800×450 viewport without clipping (research.md Decision 8).
const CONTROL_ROW_HEIGHT = 34;

/**
 * 028-pre-race-setup: dedicated car-only setup phase between the run hub and
 * ContestScene. Every value shown here comes from `raceSetupSceneModel`
 * (pure, framework-free) — this scene owns no delta/eligibility arithmetic
 * of its own (contract §9, plan.md "Structure Decision"). Named
 * `setupInput` (not `input`) so it never shadows Phaser.Scene's own
 * `this.input` (InputPlugin), which this scene also uses for keyboard.
 */
export class PreRaceScene extends Phaser.Scene {
  private setupInput!: RaceSetupInput;
  private selections: SetupSelections = {};
  private focusedFamily: SetupControlFamily = "driver-aggression";
  private objects: Phaser.GameObjects.GameObject[] = [];
  private focusRing?: PracticeFocusHandle;

  constructor() {
    super("PreRaceScene");
  }

  create(data: {
    run?: Run;
    encounterId?: string;
    /** Present only when returning from setup-origin Test Day (contract §8). */
    originState?: { setupSnapshot?: PracticeSetupSnapshot };
  }): void {
    configureHiDpiScene(this);
    if (!data.run || !data.encounterId) {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }
    try {
      this.setupInput = raceSetupInput(data.run, data.encounterId);
    } catch {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }

    // 028-pre-race-setup FR-012D: returning from setup-origin Test Day
    // restores the exact uncommitted draft/focus instead of re-defaulting.
    const restored = data.originState?.setupSnapshot;
    if (restored) {
      this.selections = { ...restored.draftSelections };
      this.focusedFamily = restored.focusFamily ?? "driver-aggression";
    } else {
      // Setup is intentionally chosen fresh for every race. Championship-wide
      // setup memory remains dormant in legacy run data but is not read here.
      this.selections = {};
      this.focusedFamily = "driver-aggression";
    }

    // Drawn once, not per-render: addDemoBackdrop adds a translucent overlay
    // rectangle that isn't tracked/destroyed by render()'s cleanup, so
    // calling it again on every selection change stacked a new overlay on
    // top each time, darkening the screen with every click.
    addDemoBackdrop(this, "scene-pre-race-setup", 0.32);
    addRunStamp(this, this.setupInput.run);

    this.bindKeyboard();
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.focusRing?.destroy());
  }

  private bindKeyboard(): void {
    const keyboard = this.input.keyboard;
    keyboard?.on("keydown-ESC", () => this.back());
    keyboard?.on("keydown-ENTER", () => this.startRace());
    keyboard?.on("keydown-LEFT", () => this.step(-1));
    keyboard?.on("keydown-RIGHT", () => this.step(1));
    (["ONE", "TWO", "THREE", "FOUR", "FIVE"] as const).forEach((key, index) => {
      keyboard?.on(`keydown-${key}`, () => this.focusByIndex(index));
    });
  }

  private focusByIndex(index: number): void {
    const control = this.model().controls[index];
    if (control) {
      this.focusedFamily = control.family;
      this.render();
    }
  }

  private step(direction: -1 | 1): void {
    const control = this.model().controls.find((candidate) => candidate.family === this.focusedFamily);
    if (!control) return;
    const currentIndex = control.positions.findIndex((position) => position.id === control.selectedPosition);
    const nextIndex = Phaser.Math.Clamp(currentIndex + direction, 0, control.positions.length - 1);
    this.selectPosition(control.family, control.positions[nextIndex].id);
  }

  private selectPosition(family: SetupControlFamily, position: SetupPositionId): void {
    this.selections = { ...this.selections, [family]: position };
    this.focusedFamily = family;
    this.render();
  }

  private model(): RaceSetupSceneModel {
    return raceSetupSceneModel(this.setupInput, this.selections);
  }

  private back(): void {
    this.scene.start("RunScene", { run: this.setupInput.run });
  }

  private startRace(): void {
    const setup = lockRaceSetup(this.setupInput, this.selections);
    if (!("controls" in setup)) {
      // Defensive only — eligibleControls always includes driver-aggression,
      // so lockRaceSetup cannot fail on the scene's own well-typed draft.
      this.scene.start("RunScene", { unavailable: true });
      return;
    }
    this.scene.start("ContestScene", { run: this.setupInput.run, encounterId: this.setupInput.encounterId, setup });
  }

  /**
   * 028-pre-race-setup FR-012D/E: creates a temporary immutable snapshot of
   * the exact current draft — Test Day resolves against it and returns to
   * it unchanged; it never becomes remembered/scored state.
   */
  private openTestDay(): void {
    const locked = lockRaceSetup(this.setupInput, this.selections);
    if (!("controls" in locked)) {
      this.scene.start("RunScene", { unavailable: true });
      return;
    }
    const setupSnapshot: PracticeSetupSnapshot = {
      origin: "pre-race-setup",
      track: this.setupInput.track,
      setup: locked,
      draftSelections: this.selections,
      rememberChecked: false,
      focusFamily: this.focusedFamily,
    };
    const origin: PracticeOriginInput = {
      context: "pre-race-setup",
      selection: "start-race-control",
      navigation: { viewToken: "pre-race-setup", focusToken: "test-day-control", scrollToken: "top" },
      setupSnapshot,
    };
    this.scene.start("TestDayScene", { run: this.setupInput.run, origin });
  }

  private render(): void {
    this.objects.forEach((object) => object.destroy());
    this.objects = [];
    this.focusRing?.destroy();

    const model = this.model();
    this.track(this.add.text(LOGICAL_WIDTH / 2, 26, "PRE-RACE SETUP", {
      fontSize: "24px", fontFamily: DISPLAY_FONT, fontStyle: "bold", color: "#f4d58d",
    }).setOrigin(0.5));
    const stage = this.setupInput.run.stages[this.setupInput.run.stageIndex];
    if (stage?.regionId) {
      const raceLabel = stage.raceKind === "local" ? "LOCAL RACE" : "CHAMPIONSHIP RACE";
      // Feature 035 US1 + T046: one primary circuit identity. Bound the caption
      // to the centre column (via a pure metric) so a long track/region line
      // never runs into the left track summary or the right stats panel. The
      // left track block no longer repeats the track name, so the circuit name
      // appears exactly once on this screen (UI-035-01 de-duplication).
      const identity = circuitPresentationIdentity(this.setupInput.track, stage);
      const caption = `${circuitIdentityLine(identity)} · ${raceLabel}`;
      const metrics = preRaceCaptionMetrics(caption.length);
      this.track(this.add.text(metrics.x, metrics.y, caption, {
        fontSize: `${metrics.maxFontSize}px`, fontFamily: UI_FONT, fontStyle: "bold", color: "#cddbd2",
        align: "center", wordWrap: { width: metrics.width }, maxLines: metrics.maxLines,
      }).setOrigin(0.5));
    }

    this.renderVehicle(model);
    this.renderTrack(model);
    this.renderStats(model);
    this.renderEnrichmentBriefing();
    const positionButtons = this.renderControls(model);

    const backButton = createDemoButton(this, 125, 422, "BACK", () => this.back(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    this.track(backButton);
    const testDayButton = createDemoButton(this, LOGICAL_WIDTH / 2, 422, "TEST DAY · UNSCORED", () => this.openTestDay(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    this.track(testDayButton);
    const startButton = createDemoButton(this, LOGICAL_WIDTH - 125, 422, "START RACE", () => this.startRace(), true, { fontSize: PRACTICE_CONTROL_FONT_SIZE });
    this.track(startButton);
    const inventoryButton = createDemoButton(this, LOGICAL_WIDTH - 70, 374, "INVENTORY", () => this.scene.start("InventoryScene", {
      run: this.setupInput.run,
      host: "pre-race",
      returnScene: "PreRaceScene",
      returnData: { encounterId: this.setupInput.encounterId, originState: { setupSnapshot: {
        draftSelections: { ...this.selections }, rememberChecked: false, focusFamily: this.focusedFamily,
      } } },
    }), true, { fontSize: "10px", width: 112, height: 30 });
    this.track(inventoryButton);

    this.focusRing = applyPracticeFocusRing(this, [...positionButtons, inventoryButton, backButton, testDayButton, startButton]);
  }

  /** Feature 033 briefing uses committed build and retained track evidence only. */
  private renderEnrichmentBriefing(): void {
    const identity = identityForEntrant(this.setupInput.run.identity.entrantId);
    if (!identity) return;
    const config = DEFAULT_RACE_ENRICHMENT_CONFIG;
    const stats = resolveCurrentBuildPhysicalStats(this.setupInput.build).stats;
    const sources = installedItems(this.setupInput.build)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((item) => item.id);
    const eligibility = signatureEligibilityFor("player", identity, stats, sources, config);
    const brief = driverBriefing({
      identity, eligibility,
      signatureThreshold: eligibility.threshold,
      signatureComposureCost: config.signatureActivationCost,
      initialComposure: config.initialComposure,
    });
    const risk = buildIncidentRiskModel(stats, (this.setupInput.track.characteristics.brakingDemand ?? 0) / 100, config);
    this.track(this.add.text(20, 344, [
      `${brief.passive.name} · ${brief.passive.description}`,
      `${brief.signature.name}: ${brief.signature.currentValue}/${brief.signature.threshold} ${brief.signature.eligible ? "READY" : "BUILD TOWARD"} · Composure ${brief.initialComposure}`,
      `RISK ${risk.band}: ${risk.sources.map((source) => source.label).join(", ")}`,
      risk.saferSetupAlternatives.length ? `Safer: ${risk.saferSetupAlternatives.join(" · ")}` : "Safer: balanced setup",
    ].join("\n"), { fontSize: "8px", fontFamily: UI_FONT, color: "#cddbd2", wordWrap: { width: 540 } }));
  }

  private renderVehicle(model: RaceSetupSceneModel): void {
    const key = model.vehicleAssetKey;
    if (!this.textures.exists(key)) return;
    this.track(this.add.image(LOGICAL_WIDTH / 2, 150, key).setDisplaySize(220, 120).setDepth(1));
  }

  private renderTrack(model: RaceSetupSceneModel): void {
    const graphics = this.add.graphics();
    this.track(graphics);
    // A smoothly-curved preview of the exact same track.points every other
    // renderer uses — see trackPreviewPoints's own comment for why a raw
    // straight-segment polyline reads as blocky rectangles at this small a
    // scale even though it reads fine as a track at full playback size.
    const points = trackPreviewPoints(this.setupInput.track, { scale: 0.32, offsetX: 20, offsetY: 44 });
    graphics.lineStyle(5, 0x30353a, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath();
    graphics.strokePath();
    graphics.lineStyle(1.5, 0xd5d8da, 0.9);
    graphics.strokePath();
    // T046: the circuit name is rendered exactly once, by the centre identity
    // caption. This left block is a profile/context header only (laps + segment
    // + demand + capability), never a duplicate of the track identity
    // (UI-035-01 de-duplication).
    this.track(this.add.text(20, 62, `TRACK PROFILE · ${model.lapCount} LAP${model.lapCount === 1 ? "" : "S"}`, {
      fontSize: "11px", fontFamily: UI_FONT, fontStyle: "bold", color: "#ffd447",
    }));
    this.track(this.add.text(20, 78, [model.track.segmentLine, model.track.demandLine].join("\n"), {
      fontSize: "10px", fontFamily: UI_FONT, color: "#e5ecec", lineSpacing: 4, wordWrap: { width: 190 },
    }));
    // FR-013/T045: factual capability emphasis only — never an outcome,
    // position, or unrecorded time claim (spec.md US4 Acceptance Scenario 5).
    this.track(this.add.text(20, 118, model.track.alignmentLine, {
      fontSize: "9px", fontFamily: UI_FONT, fontStyle: "italic", color: "#9eb5c9", wordWrap: { width: 190 },
    }));
  }

  private renderStats(model: RaceSetupSceneModel): void {
    const panel = addPaperPanel(this, LOGICAL_WIDTH - 130, 100, 240, 130, 0.85);
    this.track(panel);
    this.track(this.add.text(LOGICAL_WIDTH - 130, 46, "CAR · CURRENT → PROSPECTIVE", {
      fontSize: "11px", fontFamily: UI_FONT, fontStyle: "bold", color: "#d7e4e7",
    }).setOrigin(0.5));
    const lines = model.stats.map((row) =>
      `${row.label}: ${formatStatPoint(row.currentValue)} → ${formatStatPoint(row.prospectiveValue)}${row.changed ? ` (${row.deltaLabel})` : ""}`);
    this.track(this.add.text(LOGICAL_WIDTH - 130, 100, lines.join("\n"), {
      fontSize: "11px", fontFamily: UI_FONT, color: "#e5ecec", lineSpacing: 6, align: "left",
    }).setOrigin(0.5));
  }

  private renderControls(model: RaceSetupSceneModel): Phaser.GameObjects.Text[] {
    if (model.controls.length <= 1) {
      this.track(this.add.text(LOGICAL_WIDTH / 2, CONTROL_TOP_Y + 40, "No adjustable equipment installed", {
        fontSize: "13px", fontFamily: UI_FONT, color: "#aebdc2",
      }).setOrigin(0.5));
    }
    const buttons: Phaser.GameObjects.Text[] = [];
    model.controls.forEach((control, index) => {
      const y = CONTROL_TOP_Y + index * CONTROL_ROW_HEIGHT;
      buttons.push(...this.renderControlRow(control, y));
    });
    return buttons;
  }

  private renderControlRow(control: SetupControlRow, y: number): Phaser.GameObjects.Text[] {
    const focused = control.family === this.focusedFamily;
    const sourceSuffix = control.isUniversal ? "" : ` (${control.sourceLabel})`;
    // Feature 035 US1/T024: eligible installed equipment controls are labelled
    // ADJUSTABLE so the reserved vocabulary is explicit and consistent.
    const adjustableToken = control.isUniversal ? "" : "ADJUSTABLE · ";
    this.track(this.add.text(70, y, `${adjustableToken}${control.label}${sourceSuffix}`, {
      fontSize: "12px", fontFamily: UI_FONT, fontStyle: focused ? "bold" : "normal",
      color: focused ? "#ffd447" : "#d7e4e7",
    }));
    const buttons = control.positions.map((position, positionIndex) => {
      const label = position.selected ? `> ${position.label} <` : position.label;
      const button = createRuntimeTextControl(this, {
        family: "selector",
        x: 380 + positionIndex * 110,
        y: y + 1,
        width: 102,
        height: 28,
        label,
        focused,
        action: () => this.selectPosition(control.family, position.id),
        fontFamily: UI_FONT,
        fontSize: "11px",
      });
      this.track(button);
      return button;
    });
    this.track(this.add.text(70, y + 16, control.selectedDeltaLabel, {
      fontSize: "10px", fontFamily: UI_FONT, color: "#9eb5c9",
    }));
    return buttons;
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}
